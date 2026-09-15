import React, { useCallback, useRef, useState } from 'react';
import {
  Linking, Pressable, ScrollView, Text, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import type { QuickLink } from '../api';
import { font, radius, useTheme } from '../theme';
import { NO_DRAG } from '../webStyles';

function LinkChip({ link }: { link: QuickLink }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      dataSet={NO_DRAG}
      onPress={() => Linking.openURL(link.url).catch(() => {})}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="link"
      accessibilityLabel={`open ${link.label} (${link.url})`}
      style={{
        height: 24,
        paddingHorizontal: 9,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hover ? t.accentSoft : t.field,
        borderWidth: 1,
        borderColor: hover ? 'transparent' : t.separator,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: font.ui,
          fontSize: 12,
          color: hover ? t.accentStrong : t.textSecondary,
        }}
      >
        {link.label}
      </Text>
    </Pressable>
  );
}

type Fade = 'none' | 'left' | 'right' | 'both';

/** Which edges have more content behind them; the CSS mask fades those. */
function fadeFor(x: number, viewport: number, content: number): Fade {
  if (content <= viewport + 1) return 'none';
  const atStart = x <= 1;
  const atEnd = x + viewport >= content - 1;
  if (atStart) return 'right';
  if (atEnd) return 'left';
  return 'both';
}

/**
 * The tools around the writing: figma, capcut, the network itself. Read from
 * `links.md` in the vault, one chip per link; the pencil opens that file.
 * Too many for the toolbar and the strip scrolls sideways, fading where it
 * continues.
 */
export function QuickLinks({ links, onEdit }: { links: QuickLink[]; onEdit: () => void }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const [fade, setFade] = useState<Fade>('none');

  const scrollX = useRef(0);
  const viewport = useRef(0);
  const content = useRef(0);
  const refresh = useCallback(() => {
    setFade(fadeFor(scrollX.current, viewport.current, content.current));
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    viewport.current = e.nativeEvent.layout.width;
    refresh();
  }, [refresh]);
  const onContentSizeChange = useCallback((w: number) => {
    content.current = w;
    refresh();
  }, [refresh]);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
    refresh();
  }, [refresh]);

  return (
    <View
      style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }}
    >
      <ScrollView
        horizontal
        dataSet={{ fade }}
        showsHorizontalScrollIndicator={false}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          // Room for the fade so the outer chips are never dimmed at rest.
          paddingHorizontal: fade === 'none' ? 0 : 4,
        }}
      >
        {links.map((link) => (
          <LinkChip key={link.url} link={link} />
        ))}
      </ScrollView>
      <Pressable
        dataSet={NO_DRAG}
        onPress={onEdit}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        accessibilityRole="button"
        accessibilityLabel="edit quick links"
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hover ? t.hover : 'transparent',
        }}
      >
        <Text style={{ fontFamily: font.ui, fontSize: 12, color: hover ? t.text : t.textTertiary }}>
          {links.length ? '✎' : '+ links'}
        </Text>
      </Pressable>
    </View>
  );
}
