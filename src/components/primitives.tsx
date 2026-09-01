import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { font, radius, useTheme, type Theme } from '../theme';
import { NO_DRAG } from '../webStyles';

/** A quiet toolbar button that only reveals its background on hover. */
export function IconButton({
  label,
  onPress,
  accessibilityLabel,
  wide,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  wide?: boolean;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      dataSet={NO_DRAG}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        minWidth: wide ? undefined : 28,
        height: 28,
        paddingHorizontal: wide ? 10 : 4,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hover ? t.hover : 'transparent',
      }}
    >
      <Text style={{ color: t.text, fontFamily: font.ui, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// Path from assets/github-logo.svg (24x24). Rendered as a raw <svg>:
// react-native-web hands lowercase tags to react-dom, so this needs no extra
// dependency. The source file carries a hardcoded black stroke; we fill with a
// theme colour instead so the mark follows light and dark.
const GITHUB_PATH =
  'M12 2C6.475 2 2 6.475 2 12C2 16.425 4.8625 20.1625 8.8375 21.4875C9.3375 21.575 9.525 21.275 9.525 21.0125C9.525 20.775 9.5125 19.9875 9.5125 19.15C7 19.6125 6.35 18.5375 6.15 17.975C6.0375 17.6875 5.55 16.8 5.125 16.5625C4.775 16.375 4.275 15.9125 5.1125 15.9C5.9 15.8875 6.4625 16.625 6.65 16.925C7.55 18.4375 8.9875 18.0125 9.5625 17.75C9.65 17.1 9.9125 16.6625 10.2 16.4125C7.975 16.1625 5.65 15.3 5.65 11.475C5.65 10.3875 6.0375 9.4875 6.675 8.7875C6.575 8.5375 6.225 7.5125 6.775 6.1375C6.775 6.1375 7.6125 5.875 9.525 7.1625C10.325 6.9375 11.175 6.825 12.025 6.825C12.875 6.825 13.725 6.9375 14.525 7.1625C16.4375 5.8625 17.275 6.1375 17.275 6.1375C17.825 7.5125 17.475 8.5375 17.375 8.7875C18.0125 9.4875 18.4 10.375 18.4 11.475C18.4 15.3125 16.0625 16.1625 13.8375 16.4125C14.2 16.725 14.5125 17.325 14.5125 18.2625C14.5125 19.6 14.5 20.675 14.5 21.0125C14.5 21.275 14.6875 21.5875 15.1875 21.4875C17.1727 20.8173 18.8977 19.5415 20.1198 17.8395C21.3419 16.1376 21.9995 14.0953 22 12C22 6.475 17.525 2 12 2Z'

/** Quiet link to the project's source, sitting in the toolbar corner. */
export function GithubButton({ url }: { url: string }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      dataSet={NO_DRAG}
      onPress={() => Linking.openURL(url).catch(() => {})}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="link"
      accessibilityLabel="view the source on github"
      style={{
        width: 28,
        height: 28,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hover ? t.hover : 'transparent',
      }}
    >
      {React.createElement(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
        React.createElement('path', {
          d: GITHUB_PATH,
          fill: hover ? t.text : t.textSecondary,
          fillRule: 'evenodd',
          clipRule: 'evenodd',
        }),
      )}
    </Pressable>
  );
}

/** Filled accent button, used for the single primary action per surface. */
export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      dataSet={NO_DRAG}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityRole="button"
      style={{
        height: 28,
        paddingHorizontal: 12,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.accent,
        opacity: hover ? 0.88 : 1,
      }}
    >
      <Text style={{ color: '#fff', fontFamily: font.ui, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

/** macOS-style segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
  colors,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<string, string>;
  colors?: Record<string, string>;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: t.field,
        borderRadius: radius.md - 2,
        padding: 2,
        borderWidth: 1,
        borderColor: t.separator,
      }}
    >
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              height: 24,
              flexDirection: 'row',
              gap: 5,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              backgroundColor: selected ? t.raised : 'transparent',
              ...(selected
                ? {
                    shadowColor: t.shadow,
                    shadowOpacity: 1,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 1 },
                  }
                : null),
            }}
          >
            {colors ? (
              <View
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors[opt] }}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                fontFamily: font.ui,
                fontSize: 12,
                color: selected ? t.text : t.textSecondary,
                fontWeight: selected ? '500' : '400',
              }}
            >
              {labels[opt] ?? opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  mono,
  multiline,
  style,
  autoFocus,
  inputRef,
  onKeyPress,
  invalid,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  multiline?: boolean;
  style?: ViewStyle;
  autoFocus?: boolean;
  inputRef?: React.Ref<TextInput>;
  onKeyPress?: (e: any) => void;
  invalid?: boolean;
}) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.textTertiary}
      multiline={multiline}
      autoFocus={autoFocus}
      onKeyPress={onKeyPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={[
        {
          fontFamily: mono ? font.mono : font.ui,
          fontSize: mono ? 12.5 : 13,
          lineHeight: mono ? 19 : undefined,
          color: t.text,
          backgroundColor: t.field,
          borderRadius: radius.md - 2,
          borderWidth: 1,
          borderColor: invalid ? '#FF453A' : focus ? t.accent : t.separator,
          paddingHorizontal: 9,
          paddingVertical: multiline ? 9 : 6,
          minHeight: multiline ? 0 : 28,
        },
        style as any,
      ]}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: font.ui,
        fontSize: 11,
        fontWeight: '500',
        color: t.textSecondary,
        marginBottom: 5,
        letterSpacing: 0.1,
      }}
    >
      {children}
    </Text>
  );
}

export const sheet = (t: Theme) =>
  StyleSheet.create({
    divider: { height: 1, backgroundColor: t.separator },
  });
