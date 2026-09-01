import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Post } from '../api';
import { font, radius, STATUS_COLOR, STATUS_LABEL, STATUSES, TYPE_LABEL, TYPES, useTheme } from '../theme';

export interface Filters {
  status: string | null;
  type: string | null;
  tag: string | null;
}

function Row({
  label,
  count,
  active,
  color,
  onPress,
  indent,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  onPress: () => void;
  indent?: boolean;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        height: 26,
        paddingHorizontal: 8,
        marginLeft: indent ? 8 : 0,
        borderRadius: radius.sm,
        backgroundColor: active ? t.accentSoft : hover ? t.hover : 'transparent',
      }}
    >
      {color ? (
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: font.ui,
          fontSize: 12.5,
          color: active ? t.accentStrong : t.text,
          fontWeight: active ? '500' : '400',
        }}
      >
        {label}
      </Text>
      <Text style={{ fontFamily: font.ui, fontSize: 11, color: t.textTertiary }}>{count}</Text>
    </Pressable>
  );
}

function Section({ title }: { title: string }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: font.ui,
        fontSize: 10.5,
        fontWeight: '600',
        letterSpacing: 0.4,
        color: t.textTertiary,
        marginTop: 14,
        marginBottom: 4,
        paddingHorizontal: 8,
      }}
    >
      {title}
    </Text>
  );
}

export function Sidebar({
  posts,
  filters,
  onChange,
}: {
  posts: Post[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const t = useTheme();

  const counts = useMemo(() => {
    const status: Record<string, number> = {};
    const type: Record<string, number> = {};
    const tag: Record<string, number> = {};
    for (const p of posts) {
      status[p.status] = (status[p.status] ?? 0) + 1;
      type[p.type] = (type[p.type] ?? 0) + 1;
      for (const tg of p.tags) tag[tg] = (tag[tg] ?? 0) + 1;
    }
    return { status, type, tag };
  }, [posts]);

  const tags = useMemo(
    () => Object.keys(counts.tag).sort((a, b) => counts.tag[b] - counts.tag[a] || a.localeCompare(b)),
    [counts.tag],
  );

  const toggle = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: filters[key] === value ? null : value });

  return (
    <View
      style={{
        width: 194,
        borderRightWidth: 1,
        borderColor: t.separator,
        paddingHorizontal: 6,
        paddingBottom: 10,
      }}
    >
      <ScrollView>
        <Row
          label="all posts"
          count={posts.length}
          active={!filters.status && !filters.type && !filters.tag}
          onPress={() => onChange({ status: null, type: null, tag: null })}
        />

        <Section title="status" />
        {STATUSES.map((s) => (
          <Row
            key={s}
            label={STATUS_LABEL[s]}
            count={counts.status[s] ?? 0}
            color={STATUS_COLOR[s]}
            active={filters.status === s}
            onPress={() => toggle('status', s)}
          />
        ))}

        <Section title="format" />
        {TYPES.map((ty) => (
          <Row
            key={ty}
            label={TYPE_LABEL[ty]}
            count={counts.type[ty] ?? 0}
            active={filters.type === ty}
            onPress={() => toggle('type', ty)}
          />
        ))}

        {tags.length > 0 ? (
          <>
            <Section title="tags" />
            {tags.map((tg) => (
              <Row
                key={tg}
                label={tg}
                count={counts.tag[tg]}
                active={filters.tag === tg}
                onPress={() => toggle('tag', tg)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
