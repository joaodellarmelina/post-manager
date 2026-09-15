import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { vault } from '../api';
import { font, radius, useTheme } from '../theme';
import { MarkdownView } from './MarkdownView';
import { IconButton, PrimaryButton } from './primitives';

/**
 * Read-only view of `instructions.md`, rendered. The file is what an agent
 * reads before writing here, so this is the place to check it says what you
 * meant — and to jump back into the onboarding when it does not.
 */
export function ProfileSheet({
  onClose,
  onRedo,
}: {
  onClose: () => void;
  /** Reopens the onboarding, pre-filled from the file. */
  onRedo: () => void;
}) {
  const t = useTheme();
  const [body, setBody] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      vault
        .readInstructions()
        .then(({ body: b, error: e }) => {
          if (!alive) return;
          setBody(b ?? null);
          setError(e ?? null);
        })
        .catch((err) => alive && setError(err instanceof Error ? err.message : String(err)));
    load();
    // Edits made in another editor show up here too.
    const off = vault.onChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, []);

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
        accessibilityLabel="close profile"
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
          width: 560,
          maxHeight: '86%',
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
            gap: 4,
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
            <Text style={{ fontWeight: '400', color: t.textTertiary }}>{'  '}instructions.md</Text>
          </Text>
          {body ? (
            <>
              <IconButton label="edit answers" onPress={onRedo} wide accessibilityLabel="redo the onboarding" />
              <IconButton
                label="open file"
                onPress={() => vault.openInstructions()}
                wide
                accessibilityLabel="open instructions.md in your editor"
              />
            </>
          ) : null}
          <IconButton label="✕" onPress={onClose} accessibilityLabel="close profile" />
        </View>

        {error ? (
          <View style={{ padding: 9, backgroundColor: 'rgba(255,69,58,0.14)' }}>
            <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>{error}</Text>
          </View>
        ) : null}

        {body === undefined ? (
          <View style={{ padding: 18 }}>
            <Text style={{ fontFamily: font.ui, fontSize: 13, color: t.textTertiary }}>reading…</Text>
          </View>
        ) : body === null ? (
          <View style={{ padding: 22, gap: 12, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: font.ui, fontSize: 13, lineHeight: 20, color: t.text }}>
              no profile yet. eight short questions write <Text style={{ fontFamily: font.mono, fontSize: 12 }}>instructions.md</Text>,{' '}
              <Text style={{ fontFamily: font.mono, fontSize: 12 }}>AGENTS.md</Text> and{' '}
              <Text style={{ fontFamily: font.mono, fontSize: 12 }}>CLAUDE.md</Text> into your posts
              folder, so any agent that opens it knows who you are and how you sound.
            </Text>
            <PrimaryButton label="set up your profile" onPress={onRedo} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <MarkdownView source={body} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}
