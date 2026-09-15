import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { vault, type QuickLink } from '../api';
import { font, radius, useTheme } from '../theme';
import { Field, IconButton, PrimaryButton } from './primitives';

/**
 * Edits the toolbar quick links in place — label, url, order — and writes
 * them back to `links.md`. The file stays the source of truth: anything
 * written above the list there (notes, a heading) is kept.
 */

type Row = QuickLink & { id: number };

let nextId = 1;
const withIds = (links: QuickLink[]): Row[] => links.map((l) => ({ ...l, id: nextId++ }));

/** Normalises what people actually paste: bare domains become https URLs. */
function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function SmallButton({
  label,
  onPress,
  disabled,
  accessibilityLabel,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  danger?: boolean;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={2}
      style={{
        width: 24,
        height: 24,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hover && !disabled ? t.hover : 'transparent',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <Text style={{ fontFamily: font.ui, fontSize: 12, color: danger ? '#FF453A' : t.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LinksSheet({ links, onClose }: { links: QuickLink[]; onClose: () => void }) {
  const t = useTheme();
  const [rows, setRows] = useState<Row[]>(() => withIds(links));
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(() => {
    const u = normalizeUrl(url);
    if (!u) return;
    // A label is optional: the host is a fine default ("figma.com").
    const l = label.trim() || hostOf(u) || u;
    setRows((r) => (r.some((x) => x.url === u) ? r : [...r, ...withIds([{ label: l, url: u }])]));
    setLabel('');
    setUrl('');
  }, [label, url]);

  const move = (i: number, delta: number) =>
    setRows((r) => {
      const j = i + delta;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const patch = (id: number, p: Partial<QuickLink>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await vault.writeLinks(
        rows.map(({ label: l, url: u }) => ({ label: l.trim(), url: normalizeUrl(u) })).filter((x) => x.url),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }, [rows, onClose]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [save]);

  const onFieldKey = (e: any, commit: () => void) => {
    const key = e.nativeEvent?.key;
    if (key === 'Enter') {
      e.preventDefault?.();
      if (e.metaKey || e.nativeEvent?.metaKey) save();
      else commit();
    } else if (key === 'Escape') onClose();
  };

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
        accessibilityLabel="close quick links"
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
            style={{ flex: 1, fontFamily: font.ui, fontSize: 13, fontWeight: '600', letterSpacing: -0.1, color: t.text }}
          >
            quick links
            <Text style={{ fontWeight: '400', color: t.textTertiary }}>{'  '}links.md</Text>
          </Text>
          <IconButton
            label="open file"
            onPress={() => vault.editLinks()}
            wide
            accessibilityLabel="open links.md in your editor"
          />
          <IconButton label="✕" onPress={onClose} accessibilityLabel="close quick links" />
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, gap: 6 }}>
          {rows.length === 0 ? (
            <Text style={{ fontFamily: font.ui, fontSize: 12.5, color: t.textTertiary, paddingVertical: 8 }}>
              no links yet — the tools around your writing go here: figma, capcut, the network itself.
            </Text>
          ) : null}

          {rows.map((row, i) => (
            <View
              key={row.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 4,
                paddingLeft: 6,
                paddingRight: 2,
                borderRadius: radius.md - 2,
                backgroundColor: t.field,
                borderWidth: 1,
                borderColor: t.separator,
              }}
            >
              <View style={{ gap: 0 }}>
                <SmallButton label="▴" onPress={() => move(i, -1)} disabled={i === 0} accessibilityLabel="move up" />
                <SmallButton
                  label="▾"
                  onPress={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  accessibilityLabel="move down"
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Field
                  value={row.label}
                  onChangeText={(v) => patch(row.id, { label: v })}
                  placeholder="label"
                  onKeyPress={(e: any) => onFieldKey(e, () => {})}
                />
                <Field
                  value={row.url}
                  onChangeText={(v) => patch(row.id, { url: v })}
                  placeholder="https://…"
                  mono
                  onKeyPress={(e: any) => onFieldKey(e, () => {})}
                />
              </View>
              <SmallButton
                label="×"
                onPress={() => setRows((r) => r.filter((x) => x.id !== row.id))}
                accessibilityLabel={`remove ${row.label}`}
                danger
              />
            </View>
          ))}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: rows.length ? 8 : 0,
            }}
          >
            <View style={{ width: 130 }}>
              <Field
                value={label}
                onChangeText={setLabel}
                placeholder="label"
                onKeyPress={(e: any) => onFieldKey(e, add)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                value={url}
                onChangeText={setUrl}
                placeholder="paste a link and press enter"
                mono
                autoFocus={rows.length === 0}
                onKeyPress={(e: any) => onFieldKey(e, add)}
              />
            </View>
            <IconButton label="add" onPress={add} wide accessibilityLabel="add link" />
          </View>

          {error ? <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>{error}</Text> : null}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            height: 50,
            gap: 8,
            borderTopWidth: 1,
            borderColor: t.separator,
          }}
        >
          <Text style={{ flex: 1, fontFamily: font.ui, fontSize: 11.5, color: t.textTertiary }}>
            only http(s) links are kept. notes above the list in links.md stay as they are.
          </Text>
          <IconButton label="cancel" onPress={onClose} wide />
          <PrimaryButton label={saving ? 'saving…' : 'save  ⌘↵'} onPress={saving ? () => {} : save} />
        </View>
      </View>
    </View>
  );
}
