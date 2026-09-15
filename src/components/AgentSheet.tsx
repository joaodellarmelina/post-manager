import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { vault, type AgentDetection, type AgentId, type TerminalId } from '../api';
import { font, radius, useTheme } from '../theme';
import { Field, IconButton, PrimaryButton, Segmented } from './primitives';

/**
 * Opens a coding agent in the posts folder. The folder already explains itself
 * (AGENTS.md / CLAUDE.md → instructions.md), so the agent arrives briefed; this
 * sheet only picks which one, where, and optionally what to start with.
 */

const AGENTS: { id: AgentId; label: string; install: string; note: string }[] = [
  { id: 'claude', label: 'claude code', install: 'npm i -g @anthropic-ai/claude-code', note: 'reads CLAUDE.md on arrival' },
  { id: 'codex', label: 'codex', install: 'npm i -g @openai/codex', note: 'reads AGENTS.md on arrival' },
  { id: 'gemini', label: 'gemini cli', install: 'npm i -g @google/gemini-cli', note: 'point it at AGENTS.md' },
];

const TERMINALS = ['terminal', 'warp'] as const;
const TERMINAL_LABEL = { terminal: 'terminal', warp: 'warp' };

const STARTERS: { label: string; prompt: string }[] = [
  {
    label: 'draft next week',
    prompt:
      'read instructions.md, then draft three posts for next week — one file each, status draft. pick the pillars and formats that make sense.',
  },
  {
    label: 'review drafts',
    prompt:
      'review every post with status: draft against instructions.md. suggest edits post by post; do not rewrite anything until i say so.',
  },
  {
    label: 'ideas',
    prompt: 'give me ten post ideas per content pillar, as a list. no files yet.',
  },
];

const TERMINAL_KEY = 'post-manager.agent-terminal';
const AGENT_KEY = 'post-manager.agent-last';

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Fine: the choice just is not remembered.
  }
}

function AgentRow({
  label,
  note,
  path,
  checked,
  install,
  onPress,
}: {
  label: string;
  note: string;
  /** Resolved path; null = not found; undefined = still checking. */
  path: string | null | undefined;
  /** False when the shell could not be asked — then null does not mean missing. */
  checked: boolean;
  install: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const missing = checked && path === null;
  const unverified = !checked && path === null;

  const copyInstall = () => {
    navigator.clipboard?.writeText(install).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Pressable
      onPress={missing ? copyInstall : onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={missing ? `${label} is not installed — copy the install command` : `open ${label} in the posts folder`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: hover ? (missing ? t.hover : t.accentSoft) : t.field,
        borderWidth: 1,
        borderColor: hover && !missing ? 'transparent' : t.separator,
        opacity: missing ? 0.75 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: font.ui,
            fontSize: 13.5,
            fontWeight: '600',
            letterSpacing: -0.1,
            color: hover && !missing ? t.accentStrong : t.text,
          }}
        >
          {label}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: missing ? font.mono : font.ui, fontSize: 11, color: t.textTertiary }}>
          {missing
            ? copied ? 'copied — paste it in a terminal' : `not installed — ${install}`
            : unverified
              ? `${note}  ·  couldn't check your shell — try it`
              : `${note}  ·  ${path ?? 'checking…'}`}
        </Text>
      </View>
      <Text style={{ fontFamily: font.ui, fontSize: 12, color: hover && !missing ? t.accentStrong : t.textTertiary }}>
        {missing ? 'copy' : 'open →'}
      </Text>
    </Pressable>
  );
}

export function AgentSheet({
  hasProfile,
  onSetupProfile,
  onLaunched,
  onClose,
}: {
  hasProfile: boolean;
  onSetupProfile: () => void;
  onLaunched: (message: string) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [detection, setDetection] = useState<AgentDetection | null>(null);
  const [terminal, setTerminal] = useState<TerminalId>(() => (stored(TERMINAL_KEY) === 'warp' ? 'warp' : 'terminal'));
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState<AgentId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    vault
      .detectAgents()
      .then((d) => {
        if (!alive) return;
        setDetection(d);
        // Warp remembered but gone since → back to Terminal.
        if (!d.terminals.includes('warp')) setTerminal('terminal');
      })
      .catch(
        () =>
          alive &&
          setDetection({ agents: { claude: null, codex: null, gemini: null }, terminals: ['terminal'], checked: false, shell: '' }),
      );
    return () => {
      alive = false;
    };
  }, []);

  const launch = useCallback(
    async (agent: AgentId) => {
      setBusy(agent);
      setError(null);
      try {
        const r = await vault.launchAgent({ agent, terminal, prompt: prompt.trim() });
        store(AGENT_KEY, agent);
        store(TERMINAL_KEY, terminal);
        onLaunched(`${r.agent} opened in ${r.terminal}, inside your posts folder — its window may be behind this one`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBusy(null);
      }
    },
    [terminal, prompt, onLaunched],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const last = (stored(AGENT_KEY) as AgentId | null) ?? 'claude';
        if (!(detection?.checked && detection.agents[last] === null)) launch(last);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [launch, detection]);

  const showTerminals = detection?.terminals.includes('warp') ?? false;
  const lastAgent = stored(AGENT_KEY);
  const ordered = [...AGENTS].sort((a, b) => (a.id === lastAgent ? -1 : b.id === lastAgent ? 1 : 0));

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <Pressable
        accessibilityLabel="close agent picker"
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: t.scheme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)',
        }}
      />

      <View
        accessibilityRole="none"
        style={{
          width: 480,
          borderRadius: radius.lg,
          backgroundColor: t.panelSolid,
          borderWidth: 1,
          borderColor: t.separator,
          shadowColor: '#000',
          shadowOpacity: t.scheme === 'dark' ? 0.6 : 0.22,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 12 },
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 14,
            paddingRight: 8,
            height: 42,
            borderBottomWidth: 1,
            borderColor: t.separator,
          }}
        >
          <Text
            style={{ flex: 1, fontFamily: font.ui, fontSize: 13, fontWeight: '600', letterSpacing: -0.1, color: t.text }}
          >
            open an agent in your posts folder
          </Text>
          <IconButton label="✕" onPress={onClose} accessibilityLabel="close agent picker" />
        </View>

        <View style={{ padding: 14, gap: 8 }}>
          {!hasProfile ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 9,
                borderRadius: radius.md,
                backgroundColor: 'rgba(255,159,10,0.16)',
              }}
            >
              <Text style={{ flex: 1, fontFamily: font.ui, fontSize: 11.5, lineHeight: 16, color: t.text }}>
                no instructions.md yet — the agent will know the file format, but not who you are or how you sound.
              </Text>
              <IconButton label="set up profile" onPress={onSetupProfile} wide />
            </View>
          ) : null}

          {ordered.map((a) => (
            <AgentRow
              key={a.id}
              label={busy === a.id ? `${a.label} — opening…` : a.label}
              note={a.note}
              install={a.install}
              path={detection ? detection.agents[a.id] : undefined}
              checked={detection?.checked ?? false}
              onPress={() => (busy ? null : launch(a.id))}
            />
          ))}

          <View style={{ gap: 6, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: font.ui, fontSize: 11, fontWeight: '500', color: t.textSecondary, letterSpacing: 0.1 }}>
                start with
              </Text>
              <Text style={{ fontFamily: font.ui, fontSize: 11, color: t.textTertiary }}>optional</Text>
              <View style={{ flex: 1 }} />
              {STARTERS.map((s) => (
                <Pressable
                  key={s.label}
                  onPress={() => setPrompt(s.prompt)}
                  accessibilityRole="button"
                  accessibilityLabel={`use the "${s.label}" starter prompt`}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: radius.md,
                    backgroundColor: prompt === s.prompt ? t.accentSoft : t.field,
                    borderWidth: 1,
                    borderColor: prompt === s.prompt ? 'transparent' : t.separator,
                  }}
                >
                  <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: prompt === s.prompt ? t.accentStrong : t.textSecondary }}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              value={prompt}
              onChangeText={setPrompt}
              placeholder="what to ask first — or leave empty and just talk to it"
              multiline
              style={{ minHeight: 56, textAlignVertical: 'top' } as any}
            />
          </View>

          {showTerminals ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Text style={{ fontFamily: font.ui, fontSize: 11, fontWeight: '500', color: t.textSecondary, letterSpacing: 0.1 }}>
                open in
              </Text>
              <View style={{ width: 170 }}>
                <Segmented<TerminalId>
                  options={TERMINALS}
                  value={terminal}
                  onChange={setTerminal}
                  labels={TERMINAL_LABEL}
                />
              </View>
            </View>
          ) : null}

          {error ? <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>{error}</Text> : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            height: 46,
            gap: 8,
            borderTopWidth: 1,
            borderColor: t.separator,
          }}
        >
          <Text style={{ flex: 1, fontFamily: font.ui, fontSize: 11.5, color: t.textTertiary }}>
            the agent reads AGENTS.md / CLAUDE.md on arrival; those point to instructions.md.
          </Text>
          <PrimaryButton
            label={busy ? 'opening…' : `${AGENTS.find((a) => a.id === (lastAgent ?? 'claude'))?.label ?? 'claude code'}  ⌘↵`}
            onPress={() => (busy ? null : launch((lastAgent as AgentId | null) ?? 'claude'))}
          />
        </View>
      </View>
    </View>
  );
}
