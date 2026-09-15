import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { hasBridge, vault, type Answers, type Post, type PostDraft } from '../api';
import { AgentSheet } from '../components/AgentSheet';
import { EditorPanel } from '../components/EditorPanel';
import { LinksSheet } from '../components/LinksSheet';
import { MonthGrid } from '../components/MonthGrid';
import { EMPTY_ANSWERS, OnboardingSheet } from '../components/OnboardingSheet';
import { PostList } from '../components/PostList';
import { ProfileSheet } from '../components/ProfileSheet';
import { QuickLinks } from '../components/QuickLinks';
import { ShortcutsSheet } from '../components/ShortcutsSheet';
import { NO_FILTERS, Sidebar, type Filters } from '../components/Sidebar';
import { Field, GithubButton, IconButton, PrimaryButton, Segmented } from '../components/primitives';
import { addMonths, monthLabel, todayISO } from '../dates';
import { usePosts } from '../hooks/usePosts';
import { useQuickLinks } from '../hooks/useQuickLinks';
import { font, useTheme } from '../theme';
import { DRAG, NO_DRAG } from '../webStyles';

/** Width reserved so the traffic lights never overlap toolbar content. */
const TRAFFIC_LIGHTS = 78;

const REPO_URL = 'https://github.com/joaodellarmelina/post-manager';

const VIEWS = ['calendar', 'list'] as const;
const VIEW_LABELS = { calendar: 'calendar view', list: 'list view' };
const VIEW_ICONS = { calendar: 'calendar', list: 'list' } as const;
type ViewMode = (typeof VIEWS)[number];

const VIEW_KEY = 'post-manager.view';
/** Set when the first-launch onboarding is closed unsaved, so it does not nag. */
const ONBOARDING_DISMISSED_KEY = 'post-manager.onboarding-dismissed';
const NOTICE_MS = 4000;

/** Remembering the last view is a per-machine convenience, not vault data. */
function storedView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'list' ? 'list' : 'calendar';
  } catch {
    return 'calendar';
  }
}

function emptyDraft(date: string): PostDraft {
  return {
    title: '',
    date,
    time: '18:00',
    status: 'draft',
    network: 'instagram',
    type: 'feed',
    tags: [],
    links: [],
    body: '',
    script: '',
  };
}

export function CalendarScreen() {
  const t = useTheme();
  const { posts, loading, error, save, remove } = usePosts();
  const { links: quickLinks } = useQuickLinks();
  const [showLinks, setShowLinks] = useState(false);
  const editLinks = useCallback(() => setShowLinks(true), []);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<Post | null>(null);
  const [draftPost, setDraftPost] = useState<Post | null>(null);
  const [query, setQuery] = useState('');
  // The search box is a magnifier until it is needed; it stays open while
  // there is a query, since that query is filtering what is on screen.
  const [searchOpen, setSearchOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // null = closed; otherwise the answers the sheet opens with.
  const [onboarding, setOnboarding] = useState<Answers | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const onboardingChecked = useRef(false);
  // Bumped only when a different post is opened. The editor panel is keyed on
  // this rather than on the filename, which changes when a save renames the
  // file and would otherwise remount the panel mid-edit.
  const [editorSession, setEditorSession] = useState(0);
  const [view, setView] = useState<ViewMode>(storedView);

  const changeView = useCallback((next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private windows and cleared site data are fine; the view just resets.
    }
  }, []);

  const searchRef = useRef<TextInput>(null);
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    // The field mounts on the next render; focus it once it exists.
    setTimeout(() => searchRef.current?.focus(), 0);
  }, []);
  const closeSearchIfEmpty = useCallback(() => {
    if (!query.trim()) {
      setQuery('');
      setSearchOpen(false);
    }
  }, [query]);
  const saveRef = useRef<(() => void) | null>(null);
  const registerSave = useCallback((fn: () => void) => {
    saveRef.current = fn;
  }, []);

  /** Opens the onboarding with what is on disk, or a guess from the posts. */
  const openOnboarding = useCallback(async () => {
    const { answers, error } = await vault.readInstructions();
    if (error) setNotice(error);
    const seen = Array.from(new Set(posts.map((p) => p.network)));
    setShowProfile(false);
    setShowAgent(false);
    setOnboarding(answers ?? { ...EMPTY_ANSWERS, networks: seen });
  }, [posts]);

  const openAgent = useCallback(async () => {
    try {
      const { answers } = await vault.readInstructions();
      setHasProfile(!!answers);
    } catch {
      setHasProfile(true);
    }
    setShowAgent(true);
  }, []);

  const saveOnboarding = useCallback(async (answers: Answers) => {
    await vault.writeInstructions(answers);
    setOnboarding(null);
    // Show the result right away: this is what an agent will read.
    setShowProfile(true);
    setNotice('instructions.md, AGENTS.md and CLAUDE.md written to your posts folder');
  }, []);

  const closeOnboarding = useCallback(() => {
    setOnboarding(null);
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1');
    } catch {
      // Without storage it simply asks again next launch.
    }
  }, []);

  // First launch: no instructions.md yet and never dismissed → offer the onboarding.
  useEffect(() => {
    if (!hasBridge || loading || onboardingChecked.current) return;
    onboardingChecked.current = true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === '1';
    } catch {
      // Fine: treat as not dismissed.
    }
    if (dismissed) return;
    vault
      .readInstructions()
      .then(({ answers, error }) => {
        if (!answers && !error) openOnboarding();
      })
      .catch(() => {});
  }, [loading, openOnboarding]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (filters.network && p.network !== filters.network) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.type && p.type !== filters.type) return false;
      if (filters.tag && !p.tags.includes(filters.tag)) return false;
      if (
        q &&
        !(
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.script.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [posts, filters, query]);

  // Keep the open post in sync with what is on disk; close it if it vanished.
  useEffect(() => {
    if (!selected) return;
    const fresh = posts.find((p) => p.filename === selected.filename);
    if (fresh) {
      if (fresh !== selected) setSelected(fresh);
    } else if (!loading) {
      setSelected(null);
    }
  }, [posts, loading, selected]);

  const openPost = useCallback((p: Post) => {
    setDraftPost(null);
    setSelected(p);
    setEditorSession((n) => n + 1);
  }, []);

  const createAt = useCallback((iso: string) => {
    setSelected(null);
    setDraftPost({ filename: '', error: null, ...emptyDraft(iso) });
    setEditorSession((n) => n + 1);
  }, []);

  const handleSave = useCallback(
    async (filename: string | null, draft: PostDraft) => {
      const saved = await save(filename, draft);
      // A brand-new post gains a filename here; adopt it as the open post.
      setDraftPost(null);
      setSelected(saved);
      return saved;
    },
    [save],
  );

  const handleDelete = useCallback(async () => {
    const target = selected;
    setDraftPost(null);
    setSelected(null);
    if (target?.filename) await remove(target.filename);
  }, [selected, remove]);

  /** Closes the topmost dismissable surface; false when there was none. */
  const closePanel = useCallback(() => {
    if (onboarding) {
      closeOnboarding();
      return true;
    }
    if (showAgent) {
      setShowAgent(false);
      return true;
    }
    if (showProfile) {
      setShowProfile(false);
      return true;
    }
    if (showLinks) {
      setShowLinks(false);
      return true;
    }
    if (showShortcuts) {
      setShowShortcuts(false);
      return true;
    }
    if (draftPost || selected) {
      setDraftPost(null);
      setSelected(null);
      return true;
    }
    return false;
  }, [onboarding, closeOnboarding, showAgent, showProfile, showLinks, showShortcuts, draftPost, selected]);

  const goToday = useCallback(() => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }, []);

  const shiftMonth = useCallback(
    (delta: number) => {
      const next = addMonths(year, month, delta);
      setYear(next.year);
      setMonth(next.month);
    },
    [year, month],
  );

  // Native menu accelerators arrive here.
  useEffect(() => {
    return vault.onMenu((action) => {
      switch (action) {
        case 'new':
          createAt(todayISO());
          break;
        case 'save':
          saveRef.current?.();
          break;
        case 'close-panel':
          // Cmd+W closes the panel first, and only then the window.
          if (!closePanel()) vault.closeWindow();
          break;
        case 'delete':
          if (selected) handleDelete();
          break;
        case 'today':
          goToday();
          break;
        case 'prev-month':
          shiftMonth(-1);
          break;
        case 'next-month':
          shiftMonth(1);
          break;
        case 'search':
          openSearch();
          break;
        case 'toggle-sidebar':
          setShowSidebar((v) => !v);
          break;
        case 'shortcuts':
          setShowShortcuts((v) => !v);
          break;
        case 'toggle-view':
          changeView(view === 'calendar' ? 'list' : 'calendar');
          break;
        case 'edit-links':
          editLinks();
          break;
        case 'onboarding':
          openOnboarding();
          break;
        case 'profile':
          setShowProfile((v) => !v);
          break;
        case 'agent':
          openAgent();
          break;
      }
    });
  }, [
    createAt, closePanel, handleDelete, goToday, shiftMonth, selected, view, changeView, editLinks,
    openOnboarding, openAgent, openSearch,
  ]);

  // Esc closes the panel — the macOS idiom for a transient inspector.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closePanel]);

  const openEditor = draftPost ?? selected;

  return (
    <View style={{ flex: 1, backgroundColor: t.panel }}>
      <View
        dataSet={DRAG}
        style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: TRAFFIC_LIGHTS,
          paddingRight: 12,
          borderBottomWidth: 1,
          borderColor: t.separator,
        }}
      >
        <IconButton label="☰" onPress={() => setShowSidebar((v) => !v)} accessibilityLabel="toggle filters" />

        <View dataSet={NO_DRAG} style={{ width: 76 }}>
          <Segmented<ViewMode>
            options={VIEWS}
            value={view}
            onChange={changeView}
            labels={VIEW_LABELS}
            icons={VIEW_ICONS}
          />
        </View>

        {view === 'calendar' ? (
          <>
            <IconButton label="‹" onPress={() => shiftMonth(-1)} accessibilityLabel="previous month" />
            <Text
              style={{
                fontFamily: font.ui,
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: -0.2,
                color: t.text,
                minWidth: 132,
                textAlign: 'center',
              }}
            >
              {monthLabel(year, month)}
            </Text>
            <IconButton label="›" onPress={() => shiftMonth(1)} accessibilityLabel="next month" />
            <IconButton label="today" onPress={goToday} wide />
          </>
        ) : (
          <Text
            style={{
              fontFamily: font.ui,
              fontSize: 14,
              fontWeight: '600',
              letterSpacing: -0.2,
              color: t.text,
              marginLeft: 4,
            }}
          >
            all posts
            <Text style={{ fontSize: 12, fontWeight: '400', color: t.textTertiary }}>
              {'  '}
              {filtered.length}
            </Text>
          </Text>
        )}

        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', minWidth: 0, paddingHorizontal: 12 }}>
          <QuickLinks links={quickLinks} onEdit={editLinks} />
        </View>

        {searchOpen ? (
          <View dataSet={NO_DRAG} style={{ width: 190 }}>
            <Field
              inputRef={searchRef}
              value={query}
              onChangeText={setQuery}
              placeholder="search"
              autoFocus
              onBlur={closeSearchIfEmpty}
              onKeyPress={(e: any) => {
                if (e.nativeEvent?.key === 'Escape') {
                  if (query.trim()) searchRef.current?.blur();
                  else closeSearchIfEmpty();
                }
              }}
            />
          </View>
        ) : (
          <IconButton icon="search" onPress={openSearch} accessibilityLabel="search (⌘F)" />
        )}
        <IconButton icon="folder" onPress={() => vault.reveal()} accessibilityLabel="open folder in finder" />
        <IconButton icon="sparkle" label="agent" onPress={openAgent} wide accessibilityLabel="open an agent in the posts folder" />
        <IconButton
          icon="person"
          onPress={() => setShowProfile((v) => !v)}
          accessibilityLabel="your creator profile (instructions.md)"
        />
        <IconButton
          label="⌘"
          onPress={() => setShowShortcuts((v) => !v)}
          accessibilityLabel="keyboard shortcuts"
        />
        <PrimaryButton label="+ new" onPress={() => createAt(todayISO())} />
        <GithubButton url={REPO_URL} />
      </View>

      {!hasBridge ? (
        <View style={{ padding: 8, backgroundColor: 'rgba(255,159,10,0.16)' }}>
          <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.text, textAlign: 'center' }}>
            running outside electron — reading and writing files is unavailable.
          </Text>
        </View>
      ) : null}
      {notice ? (
        <View style={{ padding: 8, backgroundColor: t.accentSoft }}>
          <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.text, textAlign: 'center' }}>
            {notice}
            {/* The link only makes sense when the notice is about that file. */}
            {/instructions\.md/.test(notice) ? (
              <Text
                accessibilityRole="button"
                onPress={() => vault.openInstructions()}
                style={{ color: t.accentStrong, textDecorationLine: 'underline' }}
              >
                {'  '}open instructions.md
              </Text>
            ) : null}
          </Text>
        </View>
      ) : null}
      {error ? (
        <View style={{ padding: 8, backgroundColor: 'rgba(255,69,58,0.16)' }}>
          <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.text, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {showSidebar ? <Sidebar posts={posts} filters={filters} onChange={setFilters} /> : null}

        <View style={{ flex: 1 }}>
          {view === 'calendar' ? (
            <MonthGrid
              year={year}
              month={month}
              posts={filtered}
              selectedFile={selected?.filename ?? null}
              onSelectPost={openPost}
              onCreate={createAt}
            />
          ) : (
            <PostList
              posts={filtered}
              selectedFile={selected?.filename ?? null}
              onSelectPost={openPost}
            />
          )}
        </View>

        {openEditor ? (
          <EditorPanel
            key={editorSession}
            post={openEditor}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={closePanel}
            onReveal={() => vault.reveal(openEditor.filename || undefined)}
            registerSave={registerSave}
          />
        ) : null}
      </View>

      {showShortcuts ? <ShortcutsSheet onClose={() => setShowShortcuts(false)} /> : null}
      {showLinks ? <LinksSheet links={quickLinks} onClose={() => setShowLinks(false)} /> : null}
      {showAgent ? (
        <AgentSheet
          hasProfile={hasProfile}
          onSetupProfile={openOnboarding}
          onLaunched={(msg) => {
            setShowAgent(false);
            setNotice(msg);
          }}
          onClose={() => setShowAgent(false)}
        />
      ) : null}
      {showProfile ? (
        <ProfileSheet onClose={() => setShowProfile(false)} onRedo={openOnboarding} />
      ) : null}
      {onboarding ? (
        <OnboardingSheet initial={onboarding} onSave={saveOnboarding} onClose={closeOnboarding} />
      ) : null}
    </View>
  );
}
