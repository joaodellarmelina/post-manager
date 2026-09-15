import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Network, Post } from '../api';
import { ALL_FORMATS, FORMAT_LABEL, FORMATS, NETWORK_LABEL, NETWORKS } from '../networks';
import { font, radius, STATUS_COLOR, STATUS_LABEL, STATUSES, useTheme } from '../theme';

export interface Filters {
  network: string | null;
  status: string | null;
  type: string | null;
  tag: string | null;
}

export const NO_FILTERS: Filters = { network: null, status: null, type: null, tag: null };

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
    const network: Record<string, number> = {};
    const status: Record<string, number> = {};
    const type: Record<string, number> = {};
    const tag: Record<string, number> = {};
    for (const p of posts) {
      network[p.network] = (network[p.network] ?? 0) + 1;
      status[p.status] = (status[p.status] ?? 0) + 1;
      // Formats are counted within the chosen network, so "video" under
      // youtube does not include tiktok videos.
      if (!filters.network || p.network === filters.network) {
        type[p.type] = (type[p.type] ?? 0) + 1;
      }
      for (const tg of p.tags) tag[tg] = (tag[tg] ?? 0) + 1;
    }
    return { network, status, type, tag };
  }, [posts, filters.network]);

  // With a network chosen, only its formats make sense; otherwise every format once.
  const formats = filters.network ? FORMATS[filters.network as Network] : ALL_FORMATS;

  const tags = useMemo(
    () => Object.keys(counts.tag).sort((a, b) => counts.tag[b] - counts.tag[a] || a.localeCompare(b)),
    [counts.tag],
  );

  const toggle = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: filters[key] === value ? null : value });

  const toggleNetwork = (value: Network) => {
    const network = filters.network === value ? null : value;
    // Drop a format filter the new network cannot have.
    const type = network && filters.type && !FORMATS[network].includes(filters.type as any) ? null : filters.type;
    onChange({ ...filters, network, type });
  };

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
          active={!filters.network && !filters.status && !filters.type && !filters.tag}
          onPress={() => onChange(NO_FILTERS)}
        />

        <Section title="network" />
        {NETWORKS.map((n) => (
          <Row
            key={n}
            label={NETWORK_LABEL[n]}
            count={counts.network[n] ?? 0}
            active={filters.network === n}
            onPress={() => toggleNetwork(n)}
          />
        ))}

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
        {formats.map((ty) => (
          <Row
            key={ty}
            label={FORMAT_LABEL[ty]}
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
