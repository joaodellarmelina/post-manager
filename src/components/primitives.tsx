import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
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
