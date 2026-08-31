import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Post } from '../api';
import { monthGrid, todayISO, WEEKDAYS } from '../dates';
import { font, radius, STATUS_COLOR, TYPE_LABEL, useTheme } from '../theme';

const MAX_CHIPS = 3;

function PostChip({
  post,
  selected,
  compact,
  onPress,
}: {
  post: Post;
  selected: boolean;
  /** Narrow cell (editor panel open): drop the time so the title stays legible. */
  compact: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={`${post.time} ${post.title}, ${TYPE_LABEL[post.type]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 5,
        paddingVertical: 3,
        borderRadius: radius.sm,
        backgroundColor: selected ? t.accentSoft : hover ? t.hover : 'transparent',
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: post.error ? '#FF453A' : STATUS_COLOR[post.status],
          flexShrink: 0,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          fontFamily: font.ui,
          fontSize: 11.5,
          color: t.text,
          flex: 1,
          minWidth: 0,
          fontWeight: selected ? '500' : '400',
        }}
      >
        {post.title}
      </Text>
      {compact ? null : (
        <Text style={{ fontFamily: font.ui, fontSize: 10.5, color: t.textSecondary, flexShrink: 0 }}>
          {post.time}
        </Text>
      )}
    </Pressable>
  );
}

function DayCell({
  iso,
  day,
  inMonth,
  posts,
  isToday,
  selectedFile,
  onSelectPost,
  onCreate,
}: {
  iso: string;
  day: number;
  inMonth: boolean;
  posts: Post[];
  isToday: boolean;
  selectedFile: string | null;
  onSelectPost: (p: Post) => void;
  onCreate: (iso: string) => void;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const [width, setWidth] = useState(0);
  const compact = width > 0 && width < 118;
  const visible = posts.slice(0, MAX_CHIPS);
  const overflow = posts.length - visible.length;

  return (
    <Pressable
      onPress={() => onCreate(iso)}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={`dia ${day}, ${posts.length} post(s). clique para criar.`}
      style={{
        flex: 1,
        minWidth: 0,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: t.separator,
        padding: 5,
        gap: 2,
        opacity: inMonth ? 1 : 0.38,
        backgroundColor: hover ? t.hover : 'transparent',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 1 }}>
        <View
          style={{
            minWidth: 19,
            height: 19,
            paddingHorizontal: 4,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isToday ? t.accent : 'transparent',
          }}
        >
          <Text
            style={{
              fontFamily: font.ui,
              fontSize: 11.5,
              fontWeight: isToday ? '600' : '500',
              color: isToday ? t.todayText : inMonth ? t.text : t.textSecondary,
            }}
          >
            {day}
          </Text>
        </View>
        {hover && inMonth ? (
          <Text style={{ fontFamily: font.ui, fontSize: 13, color: t.textTertiary }}>+</Text>
        ) : null}
      </View>

      {visible.map((p) => (
        <PostChip
          key={p.filename}
          post={p}
          selected={p.filename === selectedFile}
          compact={compact}
          onPress={() => onSelectPost(p)}
        />
      ))}

      {overflow > 0 ? (
        <Text
          style={{ fontFamily: font.ui, fontSize: 10.5, color: t.textSecondary, paddingLeft: 5 }}
        >
          +{overflow} mais
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MonthGrid({
  year,
  month,
  posts,
  selectedFile,
  onSelectPost,
  onCreate,
}: {
  year: number;
  month: number;
  posts: Post[];
  selectedFile: string | null;
  onSelectPost: (p: Post) => void;
  onCreate: (iso: string) => void;
}) {
  const t = useTheme();
  const today = todayISO();
  const days = useMemo(() => monthGrid(year, month), [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const list = map.get(p.date);
      if (list) list.push(p);
      else map.set(p.date, [p]);
    }
    return map;
  }, [posts]);

  const weeks = useMemo(() => {
    const out: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    // Trim a trailing all-outside week so short months don't waste a row.
    if (out.length === 6 && out[5].every((d) => !d.inMonth)) out.pop();
    return out;
  }, [days]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: t.separator }}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <Text
              style={{
                fontFamily: font.ui,
                fontSize: 10.5,
                fontWeight: '600',
                letterSpacing: 0.4,
                color: t.textSecondary,
              }}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, minHeight: 420 }}>
          {weeks.map((week, i) => (
            <View key={i} style={{ flex: 1, flexDirection: 'row', minHeight: 96 }}>
              {week.map((d) => (
                <DayCell
                  key={d.iso}
                  {...d}
                  posts={byDate.get(d.iso) ?? []}
                  isToday={d.iso === today}
                  selectedFile={selectedFile}
                  onSelectPost={onSelectPost}
                  onCreate={onCreate}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
