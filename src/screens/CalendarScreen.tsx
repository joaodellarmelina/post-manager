import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { hasBridge, vault, type Post, type PostDraft } from '../api';
import { EditorPanel } from '../components/EditorPanel';
import { MonthGrid } from '../components/MonthGrid';
import { Sidebar, type Filters } from '../components/Sidebar';
import { Field, IconButton, PrimaryButton } from '../components/primitives';
import { addMonths, monthLabel, todayISO } from '../dates';
import { usePosts } from '../hooks/usePosts';
import { font, useTheme } from '../theme';
import { DRAG, NO_DRAG } from '../webStyles';

/** Width reserved so the traffic lights never overlap toolbar content. */
const TRAFFIC_LIGHTS = 78;

function emptyDraft(date: string): PostDraft {
  return {
    title: '',
    date,
    time: '18:00',
    status: 'draft',
    type: 'feed',
    tags: [],
    links: [],
    body: '',
  };
}

export function CalendarScreen() {
  const t = useTheme();
  const { posts, loading, error, save, remove } = usePosts();

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<Post | null>(null);
  const [draftPost, setDraftPost] = useState<Post | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({ status: null, type: null, tag: null });
  const [showSidebar, setShowSidebar] = useState(true);

  const searchRef = useRef<TextInput>(null);
  const saveRef = useRef<(() => void) | null>(null);
  const registerSave = useCallback((fn: () => void) => {
    saveRef.current = fn;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.type && p.type !== filters.type) return false;
      if (filters.tag && !p.tags.includes(filters.tag)) return false;
      if (q && !(p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))) return false;
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
  }, []);

  const createAt = useCallback((iso: string) => {
    setSelected(null);
    setDraftPost({ filename: '', error: null, ...emptyDraft(iso) });
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

  const closePanel = useCallback(() => {
    if (draftPost || selected) {
      setDraftPost(null);
      setSelected(null);
      return true;
    }
    return false;
  }, [draftPost, selected]);

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
          searchRef.current?.focus();
          break;
        case 'toggle-sidebar':
          setShowSidebar((v) => !v);
          break;
      }
    });
  }, [createAt, closePanel, handleDelete, goToday, shiftMonth, selected]);

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
        <IconButton label="‹" onPress={() => shiftMonth(-1)} accessibilityLabel="previous month" />
        <Text
          style={{
            fontFamily: font.ui,
            fontSize: 14,
            fontWeight: '600',
            letterSpacing: -0.2,
            color: t.text,
            minWidth: 150,
            textAlign: 'center',
          }}
        >
          {monthLabel(year, month)}
        </Text>
        <IconButton label="›" onPress={() => shiftMonth(1)} accessibilityLabel="next month" />
        <IconButton label="today" onPress={goToday} wide />

        <View style={{ flex: 1 }} />

        <View dataSet={NO_DRAG} style={{ width: 190 }}>
          <Field inputRef={searchRef} value={query} onChangeText={setQuery} placeholder="search" />
        </View>
        <IconButton label="finder" onPress={() => vault.reveal()} wide accessibilityLabel="open folder in finder" />
        <PrimaryButton label="+ new" onPress={() => createAt(todayISO())} />
      </View>

      {!hasBridge ? (
        <View style={{ padding: 8, backgroundColor: 'rgba(255,159,10,0.16)' }}>
          <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.text, textAlign: 'center' }}>
            running outside electron — reading and writing files is unavailable.
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
          <MonthGrid
            year={year}
            month={month}
            posts={filtered}
            selectedFile={selected?.filename ?? null}
            onSelectPost={openPost}
            onCreate={createAt}
          />
        </View>

        {openEditor ? (
          <EditorPanel
            key={openEditor.filename || 'new'}
            post={openEditor}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={closePanel}
            onReveal={() => vault.reveal(openEditor.filename || undefined)}
            registerSave={registerSave}
          />
        ) : null}
      </View>
    </View>
  );
}
