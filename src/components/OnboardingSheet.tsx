import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Answers, Language, Network } from '../api';
import { NETWORK_LABEL, NETWORKS } from '../networks';
import { font, radius, useTheme } from '../theme';
import { Field, IconButton, PrimaryButton, Segmented } from './primitives';

/**
 * Eight quick screens that become `instructions.md`. Each one is a set of
 * options to tick plus an optional line of your own; every screen can be
 * skipped. Options are shown — and stored — in the language the posts are
 * written in, so the generated prompt reads naturally.
 *
 * Answers stay plain strings in the file ("dev, founder — joão"), which is
 * what an agent reads; reopening the onboarding maps the known labels back to
 * ticks and leaves the rest in the free-text line.
 */

type TextKey = Exclude<keyof Answers, 'language' | 'networks'>;
type Option = { pt: string; en: string };

type Step = {
  key: TextKey;
  question: string;
  hint: string;
  options: Option[];
  /** Placeholder of the free-text line; omitted → no line. */
  free?: string;
};

const STEPS: Step[] = [
  {
    key: 'who',
    question: 'what do you do?',
    hint: 'tick what fits, add your name or handle.',
    options: [
      { pt: 'dev', en: 'developer' },
      { pt: 'designer', en: 'designer' },
      { pt: 'fundador(a)', en: 'founder' },
      { pt: 'product manager', en: 'product manager' },
      { pt: 'marketing', en: 'marketer' },
      { pt: 'criador(a) de conteúdo', en: 'content creator' },
      { pt: 'consultor(a)', en: 'consultant' },
      { pt: 'professor(a)', en: 'teacher' },
      { pt: 'estudante', en: 'student' },
    ],
    free: 'your name or handle',
  },
  {
    key: 'audience',
    question: 'who are you writing for?',
    hint: 'the person on the other side.',
    options: [
      { pt: 'devs', en: 'developers' },
      { pt: 'designers', en: 'designers' },
      { pt: 'fundadores', en: 'founders' },
      { pt: 'pessoas de produto', en: 'product people' },
      { pt: 'marketing', en: 'marketers' },
      { pt: 'iniciantes em tech', en: 'beginners in tech' },
      { pt: 'profissionais sênior', en: 'senior professionals' },
      { pt: 'donos de pequenos negócios', en: 'small business owners' },
      { pt: 'estudantes', en: 'students' },
      { pt: 'público geral', en: 'general public' },
    ],
    free: 'anything else about them',
  },
  {
    key: 'pillars',
    question: 'your content pillars',
    hint: 'the topics you always come back to. three to five is plenty.',
    options: [
      { pt: 'ia aplicada', en: 'applied ai' },
      { pt: 'programação', en: 'programming' },
      { pt: 'produto', en: 'product' },
      { pt: 'design', en: 'design' },
      { pt: 'carreira', en: 'career' },
      { pt: 'empreendedorismo', en: 'entrepreneurship' },
      { pt: 'produtividade', en: 'productivity' },
      { pt: 'bastidores', en: 'behind the scenes' },
      { pt: 'educação', en: 'education' },
      { pt: 'finanças', en: 'personal finance' },
      { pt: 'notícias e análise', en: 'news and analysis' },
      { pt: 'lifestyle', en: 'lifestyle' },
    ],
    free: 'another topic',
  },
  {
    key: 'voice',
    question: 'how do you sound?',
    hint: 'tone first; expressions that are yours go in the line below.',
    options: [
      { pt: 'direto', en: 'direct' },
      { pt: 'casual', en: 'casual' },
      { pt: 'técnico', en: 'technical' },
      { pt: 'bem-humorado', en: 'humorous' },
      { pt: 'provocador', en: 'provocative' },
      { pt: 'acolhedor', en: 'warm' },
      { pt: 'narrativo', en: 'storytelling' },
      { pt: 'minimalista', en: 'minimalist' },
      { pt: 'primeira pessoa', en: 'first person' },
      { pt: 'sem jargão', en: 'no jargon' },
    ],
    free: 'expressions you use: "bora", "na prática"…',
  },
  {
    key: 'goal',
    question: 'what should your posts cause?',
    hint: 'pick the one or two that matter most.',
    options: [
      { pt: 'crescer a audiência', en: 'grow the audience' },
      { pt: 'construir autoridade', en: 'build authority' },
      { pt: 'vender um produto', en: 'sell a product' },
      { pt: 'vender um serviço', en: 'sell a service' },
      { pt: 'conseguir vagas', en: 'get hired' },
      { pt: 'inscrições na newsletter', en: 'newsletter sign-ups' },
      { pt: 'crescer uma comunidade', en: 'grow a community' },
      { pt: 'documentar a jornada', en: 'document the journey' },
      { pt: 'ensinar', en: 'teach' },
    ],
    free: 'something specific — "sell the course", "hire two devs"',
  },
  {
    key: 'avoid',
    question: 'what to avoid?',
    hint: 'the agent will not go there.',
    options: [
      { pt: 'clickbait', en: 'clickbait' },
      { pt: 'política', en: 'politics' },
      { pt: 'religião', en: 'religion' },
      { pt: 'polêmica', en: 'controversy' },
      { pt: 'jargão', en: 'jargon' },
      { pt: 'muro de emojis', en: 'emoji walls' },
      { pt: 'promessa de dinheiro fácil', en: 'get-rich-quick promises' },
      { pt: 'tom corporativo', en: 'corporate tone' },
      { pt: 'negatividade', en: 'negativity' },
      { pt: 'textos longos', en: 'long texts' },
      { pt: 'hashtags em excesso', en: 'too many hashtags' },
    ],
    free: 'words or topics of your own',
  },
  {
    key: 'references',
    question: 'creators or posts you admire',
    hint: 'optional. a handle and what you admire in it is enough.',
    options: [],
    free: '@someone for clarity · @other for how they open a reel',
  },
];

const LANGUAGES = ['pt', 'en'] as const;
const LANGUAGE_LABEL = { pt: 'português', en: 'english' };

/** Language + networks first: the option labels depend on the language. */
const TOTAL = STEPS.length + 1;

export const EMPTY_ANSWERS: Answers = {
  language: 'pt',
  networks: [],
  who: '',
  audience: '',
  pillars: '',
  voice: '',
  goal: '',
  avoid: '',
  references: '',
};

// ---------------------------------------------------------------------------
// Answer strings ⇄ ticks + free line

type Pick = { ticked: string[]; free: string };

function label(o: Option, lang: Language) {
  return lang === 'en' ? o.en : o.pt;
}

/** Recovers ticks from a stored answer; whatever is left over is the free line. */
function parseAnswer(value: string, step: Step, lang: Language): Pick {
  let rest = value;
  const ticked: string[] = [];
  for (const o of step.options) {
    for (const l of [label(o, lang), o.pt, o.en]) {
      const re = new RegExp(`(^|[,;—\\-]\\s*)${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*([,;—]|$))`, 'i');
      if (re.test(rest)) {
        ticked.push(label(o, lang));
        rest = rest.replace(re, '$1');
        break;
      }
    }
  }
  const free = rest
    .replace(/\s*[,;]\s*(?=[,;]|$)/g, '')
    .replace(/^[\s,;—-]+|[\s,;—-]+$/g, '')
    .trim();
  return { ticked, free };
}

function joinAnswer(p: Pick) {
  const parts = [p.ticked.join(', '), p.free.trim()].filter(Boolean);
  return parts.join(' — ');
}

/** `who` reads better as "name, roles": the name leads the file title. */
function joinWho(p: Pick) {
  const parts = [p.free.trim(), p.ticked.join(', ')].filter(Boolean);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------

function Chip({ text, selected, onToggle }: { text: string; selected: boolean; onToggle: () => void }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onPress={onToggle}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={{
        height: 28,
        paddingHorizontal: 11,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? t.accentSoft : hover ? t.hover : t.field,
        borderWidth: 1,
        borderColor: selected ? 'transparent' : t.separator,
      }}
    >
      <Text style={{ fontFamily: font.ui, fontSize: 11, color: selected ? t.accentStrong : t.textTertiary }}>
        {selected ? '✓' : '○'}
      </Text>
      <Text
        style={{
          fontFamily: font.ui,
          fontSize: 12.5,
          fontWeight: selected ? '500' : '400',
          color: selected ? t.accentStrong : t.text,
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
}

export function OnboardingSheet({
  initial,
  onSave,
  onClose,
}: {
  /** Previous answers when redoing the onboarding; the app's guess otherwise. */
  initial: Answers;
  onSave: (answers: Answers) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTheme();
  const [language, setLanguage] = useState<Language>(initial.language);
  const [networks, setNetworks] = useState<Network[]>(initial.networks);
  const [picks, setPicks] = useState<Record<TextKey, Pick>>(() => {
    const out = {} as Record<TextKey, Pick>;
    for (const s of STEPS) {
      out[s.key] = parseAnswer(initial[s.key], s, initial.language);
    }
    return out;
  });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const last = step === TOTAL - 1;
  const current = step === 0 ? null : STEPS[step - 1];

  // Switching language re-labels the ticks so the stored strings follow.
  const changeLanguage = useCallback(
    (next: Language) => {
      setPicks((p) => {
        const out = { ...p };
        for (const s of STEPS) {
          out[s.key] = {
            ...p[s.key],
            ticked: p[s.key].ticked.map((tk) => {
              const o = s.options.find((x) => x.pt === tk || x.en === tk);
              return o ? label(o, next) : tk;
            }),
          };
        }
        return out;
      });
      setLanguage(next);
    },
    [],
  );

  const answers = useMemo<Answers>(() => {
    const a: Answers = { ...EMPTY_ANSWERS, language, networks };
    for (const s of STEPS) a[s.key] = s.key === 'who' ? joinWho(picks.who) : joinAnswer(picks[s.key]);
    return a;
  }, [language, networks, picks]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }, [answers, onSave]);

  const next = useCallback(() => {
    if (last) save();
    else setStep((s) => s + 1);
  }, [last, save]);

  /** Skip clears this screen's answer and moves on; on the last one it saves. */
  const skip = useCallback(() => {
    if (current) setPicks((p) => ({ ...p, [current.key]: { ticked: [], free: '' } }));
    next();
  }, [current, next]);

  // Cmd+Enter advances, Esc closes. react-native-web's TextInput stops keydown
  // from bubbling, so the free-text line gets the same handler directly.
  const onKeyDown = useCallback(
    (e: { key?: string; metaKey?: boolean; ctrlKey?: boolean; preventDefault?: () => void }) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault?.();
        next();
      } else if (e.key === 'Escape') {
        e.preventDefault?.();
        onClose();
      }
    },
    [next, onClose],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => onKeyDown(e);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKeyDown]);

  const toggleTick = (key: TextKey, text: string) =>
    setPicks((p) => {
      const cur = p[key];
      const ticked = cur.ticked.includes(text) ? cur.ticked.filter((x) => x !== text) : [...cur.ticked, text];
      return { ...p, [key]: { ...cur, ticked } };
    });

  const toggleNetwork = (n: Network) =>
    setNetworks((ns) => (ns.includes(n) ? ns.filter((x) => x !== n) : [...ns, n]));

  const heading = (text: string) => (
    <Text style={{ fontFamily: font.ui, fontSize: 16, fontWeight: '600', letterSpacing: -0.2, color: t.text }}>
      {text}
    </Text>
  );
  const hint = (text: string) => (
    <Text style={{ fontFamily: font.ui, fontSize: 12, color: t.textSecondary, marginTop: -4 }}>{text}</Text>
  );

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
        accessibilityLabel="close onboarding"
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
          width: 520,
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
            your creator profile
          </Text>
          <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.textTertiary, marginRight: 6 }}>
            {step + 1} / {TOTAL}
          </Text>
          <IconButton label="✕" onPress={onClose} accessibilityLabel="close onboarding" />
        </View>

        <View style={{ padding: 18, gap: 10, minHeight: 250 }}>
          {current ? (
            <>
              {heading(current.question)}
              {hint(current.hint)}
              {current.options.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {current.options.map((o) => {
                    const text = label(o, language);
                    return (
                      <Chip
                        key={o.en}
                        text={text}
                        selected={picks[current.key].ticked.includes(text)}
                        onToggle={() => toggleTick(current.key, text)}
                      />
                    );
                  })}
                </View>
              ) : null}
              {current.free ? (
                <Field
                  key={current.key}
                  autoFocus={current.options.length === 0}
                  value={picks[current.key].free}
                  onChangeText={(v) => setPicks((p) => ({ ...p, [current.key]: { ...p[current.key], free: v } }))}
                  placeholder={current.free}
                  onKeyPress={(e: any) =>
                    onKeyDown({
                      key: e.nativeEvent?.key,
                      metaKey: e.metaKey ?? e.nativeEvent?.metaKey,
                      ctrlKey: e.ctrlKey ?? e.nativeEvent?.ctrlKey,
                      preventDefault: () => e.preventDefault?.(),
                    })
                  }
                  style={{ marginTop: 6 }}
                />
              ) : null}
            </>
          ) : (
            <>
              {heading('language and networks')}
              {hint('the instructions — and the options ahead — follow the language your posts are in.')}
              <View style={{ width: 220, marginTop: 6 }}>
                <Segmented<Language>
                  options={LANGUAGES}
                  value={language}
                  onChange={changeLanguage}
                  labels={LANGUAGE_LABEL}
                />
              </View>
              <Text style={{ fontFamily: font.ui, fontSize: 12, color: t.textSecondary, marginTop: 8 }}>
                where you publish
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {NETWORKS.map((n) => (
                  <Chip
                    key={n}
                    text={NETWORK_LABEL[n]}
                    selected={networks.includes(n)}
                    onToggle={() => toggleNetwork(n)}
                  />
                ))}
              </View>
              <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.textTertiary, marginTop: 6 }}>
                every screen can be skipped. saving writes instructions.md, AGENTS.md and CLAUDE.md
                into your posts folder.
              </Text>
            </>
          )}
          {error ? <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>{error}</Text> : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            height: 50,
            borderTopWidth: 1,
            borderColor: t.separator,
            gap: 8,
          }}
        >
          {step > 0 ? (
            <IconButton label="back" onPress={() => setStep((s) => s - 1)} wide />
          ) : (
            <View style={{ width: 52 }} />
          )}
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <Pressable
                key={i}
                onPress={() => setStep(i)}
                accessibilityLabel={`step ${i + 1}`}
                hitSlop={4}
                style={{
                  width: i === step ? 14 : 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: i === step ? t.accent : t.border,
                }}
              />
            ))}
          </View>
          {!saving && !last ? (
            <IconButton label="skip" onPress={skip} wide accessibilityLabel="skip this question" />
          ) : null}
          {!saving && step > 0 && !last ? (
            <IconButton label="finish now" onPress={save} wide accessibilityLabel="save with what you have" />
          ) : null}
          <PrimaryButton
            label={saving ? 'writing…' : last ? 'save' : 'next  ⌘↵'}
            onPress={saving ? () => {} : next}
          />
        </View>
      </View>
    </View>
  );
}
