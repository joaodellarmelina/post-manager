import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import type { Post } from '../api';
import { monthLabel, todayISO, WEEKDAYS } from '../dates';
import { font, radius, STATUS_COLOR, STATUS_LABEL, TYPE_LABEL, useTheme } from '../theme';

/** "2026-09-15" -> { y, m, d, weekday } without going through Date parsing rules. */
function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, (m || 1) - 1, d || 1).getDay()] ?? '';
  return { y, m, d, weekday };
}

function Row({
  post,
  selected,
  isToday,
  onPress,
}: {
  post: Post;
  selected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const { d, weekday } = parseISO(post.date);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${post.title}, ${post.date} ${post.time}, ${STATUS_LABEL[post.status]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 34,
        paddingHorizontal: 10,
        borderRadius: radius.sm,
        backgroundColor: selected ? t.accentSoft : hover ? t.hover : 'transparent',
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          flexShrink: 0,
          backgroundColor: post.error ? '#FF453A' : STATUS_COLOR[post.status],
        }}
      />

      <View style={{ width: 54, flexShrink: 0, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text
          style={{
            fontFamily: font.ui,
            fontSize: 12,
            fontWeight: isToday ? '600' : '500',
            color: isToday ? t.accentStrong : t.text,
          }}
        >
          {String(d).padStart(2, '0')}
        </Text>
        <Text style={{ fontFamily: font.ui, fontSize: 10.5, color: t.textTertiary }}>{weekday}</Text>
      </View>

      <Text
        style={{
          width: 38,
          flexShrink: 0,
          fontFamily: font.ui,
          fontSize: 11,
          color: t.textSecondary,
        }}
      >
        {post.time}
      </Text>

      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: font.ui,
          fontSize: 12.5,
          color: t.text,
          fontWeight: selected ? '500' : '400',
        }}
      >
        {post.title}
      </Text>

      {post.links.length > 0 ? (
        <Text style={{ fontFamily: font.ui, fontSize: 10.5, color: t.textTertiary, flexShrink: 0 }}>
          ↗ {post.links.length}
        </Text>
      ) : null}

      {post.tags.length > 0 ? (
        <Text
          numberOfLines={1}
          style={{
            maxWidth: 150,
            fontFamily: font.ui,
            fontSize: 11,
            color: t.textTertiary,
            flexShrink: 0,
          }}
        >
          {post.tags.join(' ')}
        </Text>
      ) : null}

      <View
        style={{
          width: 66,
          flexShrink: 0,
          alignItems: 'flex-end',
        }}
      >
        <Text style={{ fontFamily: font.ui, fontSize: 11, color: t.textSecondary }}>
          {TYPE_LABEL[post.type]}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Every post in date order, grouped by month. Unlike the calendar this ignores
 * the month being browsed — the point is to see the whole plan at once.
 */
export function PostList({
  posts,
  selectedFile,
  onSelectPost,
}: {
  posts: Post[];
  selectedFile: string | null;
  onSelectPost: (p: Post) => void;
}) {
  const t = useTheme();
  const today = todayISO();

  const groups = useMemo(() => {
    const sorted = [...posts].sort(
      (a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.filename.localeCompare(b.filename),
    );
    const out: { key: string; label: string; items: Post[] }[] = [];
    for (const post of sorted) {
      const { y, m } = parseISO(post.date);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(post);
      else out.push({ key, label: monthLabel(y, (m || 1) - 1), items: [post] });
    }
    return out;
  }, [posts]);

  if (groups.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontFamily: font.ui, fontSize: 13, color: t.textSecondary }}>
          no posts to show
        </Text>
        <Text
          style={{ fontFamily: font.ui, fontSize: 11.5, color: t.textTertiary, marginTop: 4 }}
        >
          press ⌘n to write the first one
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      {groups.map((group) => (
        <View key={group.key}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 6,
            }}
          >
            <Text
              style={{
                fontFamily: font.ui,
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: -0.1,
                color: t.text,
              }}
            >
              {group.label}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: t.separator }} />
            <Text style={{ fontFamily: font.ui, fontSize: 11, color: t.textTertiary }}>
              {group.items.length}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 10 }}>
            {group.items.map((post) => (
              <Row
                key={post.filename}
                post={post}
                selected={post.filename === selectedFile}
                isToday={post.date === today}
                onPress={() => onSelectPost(post)}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
