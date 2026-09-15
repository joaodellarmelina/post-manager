import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Answers, Language, Network } from '../api';
import { NETWORK_LABEL, NETWORKS } from '../networks';
import { font, radius, useTheme } from '../theme';
import { Field, IconButton, PrimaryButton, Segmented } from './primitives';

/**
 * Eight direct questions, one per screen, that become `instructions.md` — the
 * creator profile an agent reads before writing posts into the folder. Nothing
 * is required: a skipped question simply leaves its section out of the file.
 */

type TextKey = Exclude<keyof Answers, 'language' | 'networks'>;

const STEPS: { key: TextKey; question: string; hint: string; placeholder: string }[] = [
  {
    key: 'who',
    question: 'who are you, in one line?',
    hint: 'name or handle, and what you do. the name becomes the title of the file.',
    placeholder: 'joão, developer who talks about ai and product',
  },
  {
    key: 'audience',
    question: 'who are you writing for?',
    hint: 'the person on the other side — what they do, what they want, what they already know.',
    placeholder: 'developers and product people curious about ai but tired of hype',
  },
  {
    key: 'pillars',
    question: 'your 3–5 content pillars',
    hint: 'the topics you always come back to.',
    placeholder: 'applied ai · building products · career in tech · behind the scenes',
  },
  {
    key: 'voice',
    question: 'how do you sound?',
    hint: 'tone, and two or three expressions that are yours.',
    placeholder: 'direct, no jargon, a bit irreverent. says "bora", "na prática", "sem rodeio".',
  },
  {
    key: 'goal',
    question: 'what should your posts cause?',
    hint: 'grow an audience, build authority, sell something, get hired…',
    placeholder: 'authority in applied ai, and sign-ups to the newsletter',
  },
  {
    key: 'avoid',
    question: 'what to avoid?',
    hint: 'topics, words, clichés, formats you don’t want.',
    placeholder: 'clickbait, "game changer", politics, get-rich-quick promises, emoji walls',
  },
  {
    key: 'references',
    question: 'creators or posts you admire',
    hint: 'and what exactly you admire in them.',
    placeholder: '@someone for clarity · @other for how they open a reel',
  },
];

const LANGUAGES = ['pt', 'en'] as const;
const LANGUAGE_LABEL = { pt: 'português', en: 'english' };

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

function NetworkChip({
  network,
  selected,
  onToggle,
}: {
  network: Network;
  selected: boolean;
  onToggle: () => void;
}) {
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? t.accentSoft : hover ? t.hover : t.field,
        borderWidth: 1,
        borderColor: selected ? 'transparent' : t.separator,
      }}
    >
      <Text
        style={{
          fontFamily: font.ui,
          fontSize: 12.5,
          fontWeight: selected ? '500' : '400',
          color: selected ? t.accentStrong : t.text,
        }}
      >
        {NETWORK_LABEL[network]}
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
  const [answers, setAnswers] = useState<Answers>(initial);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const last = step === TOTAL - 1;
  const current = STEPS[step];

  const next = useCallback(async () => {
    if (!last) {
      setStep((s) => s + 1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }, [last, answers, onSave]);

  // Cmd+Enter advances; the text fields are multiline, so plain Enter is a
  // newline. react-native-web's TextInput stops keydown from bubbling, so the
  // field gets its own handler and the document one covers the last step.
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

  const toggleNetwork = (n: Network) =>
    setAnswers((a) => ({
      ...a,
      networks: a.networks.includes(n) ? a.networks.filter((x) => x !== n) : [...a.networks, n],
    }));

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
          width: 460,
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
            style={{
              flex: 1,
              fontFamily: font.ui,
              fontSize: 13,
              fontWeight: '600',
              letterSpacing: -0.1,
              color: t.text,
            }}
          >
            your creator profile
          </Text>
          <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.textTertiary, marginRight: 6 }}>
            {step + 1} / {TOTAL}
          </Text>
          <IconButton label="✕" onPress={onClose} accessibilityLabel="close onboarding" />
        </View>

        <View style={{ padding: 18, gap: 10, minHeight: 236 }}>
          {current ? (
            <>
              <Text
                style={{
                  fontFamily: font.ui,
                  fontSize: 16,
                  fontWeight: '600',
                  letterSpacing: -0.2,
                  color: t.text,
                }}
              >
                {current.question}
              </Text>
              <Text style={{ fontFamily: font.ui, fontSize: 12, color: t.textSecondary, marginTop: -4 }}>
                {current.hint}
              </Text>
              <Field
                key={current.key}
                autoFocus
                multiline
                value={answers[current.key]}
                onChangeText={(v) => setAnswers((a) => ({ ...a, [current.key]: v }))}
                placeholder={current.placeholder}
                onKeyPress={(e: any) =>
                  onKeyDown({
                    key: e.nativeEvent?.key,
                    metaKey: e.metaKey ?? e.nativeEvent?.metaKey,
                    ctrlKey: e.ctrlKey ?? e.nativeEvent?.ctrlKey,
                    preventDefault: () => e.preventDefault?.(),
                  })
                }
                style={{ minHeight: 110, textAlignVertical: 'top', marginTop: 4 } as any}
              />
            </>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: font.ui,
                  fontSize: 16,
                  fontWeight: '600',
                  letterSpacing: -0.2,
                  color: t.text,
                }}
              >
                language and networks
              </Text>
              <Text style={{ fontFamily: font.ui, fontSize: 12, color: t.textSecondary, marginTop: -4 }}>
                the instructions are written in the language your posts are in.
              </Text>
              <View style={{ width: 220, marginTop: 6 }}>
                <Segmented<Language>
                  options={LANGUAGES}
                  value={answers.language}
                  onChange={(language) => setAnswers((a) => ({ ...a, language }))}
                  labels={LANGUAGE_LABEL}
                />
              </View>
              <Text style={{ fontFamily: font.ui, fontSize: 12, color: t.textSecondary, marginTop: 8 }}>
                where you publish
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {NETWORKS.map((n) => (
                  <NetworkChip
                    key={n}
                    network={n}
                    selected={answers.networks.includes(n)}
                    onToggle={() => toggleNetwork(n)}
                  />
                ))}
              </View>
              <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.textTertiary, marginTop: 6 }}>
                saving writes instructions.md, AGENTS.md and CLAUDE.md into your posts folder.
              </Text>
            </>
          )}
          {error ? (
            <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>{error}</Text>
          ) : null}
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
          <PrimaryButton
            label={saving ? 'writing…' : last ? 'save & write files' : 'next  ⌘↵'}
            onPress={saving ? () => {} : next}
          />
        </View>
      </View>
    </View>
  );
}
