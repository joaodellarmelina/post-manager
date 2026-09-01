import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { font, radius, useTheme } from '../theme';

/**
 * The keys shown here mirror the accelerators registered in electron/menu.js.
 * Esc and the panel-first behaviour of Cmd+W live in the renderer, which is why
 * they appear in this list but not in the menu.
 */
const GROUPS: { title: string; items: [string, string[]][] }[] = [
  {
    title: 'posts',
    items: [
      ['new post', ['⌘', 'N']],
      ['save', ['⌘', 'S']],
      ['move to trash', ['⌘', '⌫']],
      ['open folder in finder', ['⌘', '⇧', 'O']],
    ],
  },
  {
    title: 'navigation',
    items: [
      ['jump to today', ['⌘', 'T']],
      ['previous month', ['⌘', '←']],
      ['next month', ['⌘', '→']],
      ['search', ['⌘', 'F']],
    ],
  },
  {
    title: 'view',
    items: [
      ['toggle filters', ['⌘', '1']],
      ['this guide', ['⌘', '/']],
      ['close the editor panel', ['esc']],
      ['close the panel, then the window', ['⌘', 'W']],
    ],
  },
];

function Key({ label }: { label: string }) {
  const t = useTheme();
  const wide = label.length > 1;
  return (
    <View
      style={{
        minWidth: wide ? undefined : 22,
        height: 22,
        paddingHorizontal: wide ? 7 : 0,
        borderRadius: radius.sm - 1,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.raised,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.text }}>{label}</Text>
    </View>
  );
}

export function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  const t = useTheme();

  // Backdrop clicks and Esc both dismiss; Esc is handled by the screen so it
  // can decide between this sheet and the editor panel.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.activeElement as HTMLElement | null;
    return () => prev?.focus?.();
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
        accessibilityLabel="close shortcuts"
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
          width: 380,
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
            keyboard shortcuts
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="close"
            style={{
              width: 26,
              height: 26,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: font.ui, fontSize: 13, color: t.textSecondary }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, gap: 16 }}>
          {GROUPS.map((group) => (
            <View key={group.title} style={{ gap: 6 }}>
              <Text
                style={{
                  fontFamily: font.ui,
                  fontSize: 10.5,
                  fontWeight: '600',
                  letterSpacing: 0.4,
                  color: t.textTertiary,
                }}
              >
                {group.title}
              </Text>
              {group.items.map(([label, keys]) => (
                <View
                  key={label}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 26 }}
                >
                  <Text
                    style={{ flex: 1, fontFamily: font.ui, fontSize: 12.5, color: t.text }}
                  >
                    {label}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {keys.map((k, i) => (
                      <Key key={`${k}-${i}`} label={k} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
