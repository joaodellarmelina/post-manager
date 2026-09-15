import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
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

/**
 * The tools around the writing: figma, capcut, the network itself. Read from
 * `links.md` in the vault, one chip per link; the pencil opens that file.
 */
export function QuickLinks({ links, onEdit }: { links: QuickLink[]; onEdit: () => void }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);

  return (
    <View
      style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
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
