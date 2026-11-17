import React, { useCallback, useState } from 'react';
import { Linking, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import type { Post } from '../api';
import { CopyCaptionButton } from '../components/EditorPanel';
import { MarkdownView, markdownToPlainText } from '../components/MarkdownView';
import { IconButton, Label, Segmented } from '../components/primitives';
import { longDate } from '../dates';
import { FORMAT_LABEL, hasScript, NETWORK_LABEL } from '../networks';
import { font, radius, STATUS_COLOR, STATUS_LABEL, useTheme } from '../theme';
import { DRAG, NO_DRAG, TRAFFIC_LIGHTS } from '../webStyles';

/**
 * One post, read full screen. The script is the star: it fills the reading
 * column, rendered and large, while the caption and the rest of the post sit
 * in a quiet column on the right. Read-only on purpose — writing stays in the
 * editor panel, which is still mounted underneath and one Esc away.
 */

const FOCUS = ['script', 'body'] as const;
type Focus = (typeof FOCUS)[number];

/** Multipliers over the 13px the editor preview uses. */
const SCALES = [1.2, 1.45, 1.7, 2, 2.4, 2.9];
const DEFAULT_SCALE = 2;
const SCALE_KEY = 'post-manager.reader-scale';

/** Below this the side column would squeeze the text it is there to serve. */
const SIDE_MIN_WINDOW = 980;
/** A comfortable speaking pace, for the "how long is this on camera" estimate. */
const WORDS_PER_MINUTE = 150;

/** Text size is a per-machine reading preference, like the last view. */
function storedScale(): number {
  try {
    const raw = localStorage.getItem(SCALE_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 && n < SCALES.length ? n : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

function spokenLength(source: string) {
  const words = markdownToPlainText(source).split(/\s+/).filter(Boolean).length;
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);
  return { words, clock: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` };
}

export function PostScreen({ post, onClose }: { post: Post; onClose: () => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [scaleIndex, setScaleIndex] = useState(storedScale);

  // Same rule as the editor: scripted formats, plus any post that has a
  // script on disk whatever its format.
  const scripted = hasScript(post.network, post.type) || post.script.trim().length > 0;
  const [focus, setFocus] = useState<Focus>('script');
  const field: Focus = scripted ? focus : 'body';
  const other: Focus = field === 'script' ? 'body' : 'script';

  const isYoutube = post.network === 'youtube';
  const names = { script: 'script', body: isYoutube ? 'description' : 'caption' };
  const text = post[field];
  const scale = SCALES[scaleIndex];
  // Nothing to put there on a plain post without tags or links.
  const showSide =
    width >= SIDE_MIN_WINDOW && (scripted || post.tags.length > 0 || post.links.length > 0 || !!post.error);

  const resize = useCallback((delta: number) => {
    setScaleIndex((i) => {
      const next = Math.min(SCALES.length - 1, Math.max(0, i + delta));
      try {
        localStorage.setItem(SCALE_KEY, String(next));
      } catch {
        // Without storage the size just resets next time.
      }
      return next;
    });
  }, []);

  const spoken = field === 'script' && text.trim() ? spokenLength(text) : null;

  return (
    <View style={{ flex: 1 }}>
      <View
        dataSet={DRAG}
        style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: TRAFFIC_LIGHTS,
          paddingRight: 12,
          borderBottomWidth: 1,
          borderColor: t.separator,
        }}
      >
        <IconButton label="‹ back" onPress={onClose} wide accessibilityLabel="back to the calendar (esc)" />
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: font.ui, fontSize: 12, color: t.textSecondary, marginLeft: 4 }}
        >
          {post.filename || 'new post'}
        </Text>

        {scripted ? (
          <View dataSet={NO_DRAG} style={{ width: 170 }}>
            <Segmented<Focus> options={FOCUS} value={field} onChange={setFocus} labels={names} />
          </View>
        ) : null}
        <IconButton
          label="A−"
          onPress={() => resize(-1)}
          accessibilityLabel="smaller text"
        />
        <IconButton label="A+" onPress={() => resize(1)} accessibilityLabel="larger text" />
        <View dataSet={NO_DRAG}>
          <CopyCaptionButton body={text} what={names[field]} />
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 40, paddingTop: 44, paddingBottom: 96 }}
        >
          {/* The measure grows with the text so a line stays ~60 characters. */}
          <View style={{ width: '100%', maxWidth: Math.round(400 * scale) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <View
                style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STATUS_COLOR[post.status] }}
              />
              <Text style={{ fontFamily: font.ui, fontSize: 12, color: t.textSecondary }}>
                {[
                  STATUS_LABEL[post.status],
                  NETWORK_LABEL[post.network],
                  FORMAT_LABEL[post.type],
                  `${longDate(post.date)}, ${post.time}`,
                ].join('  ·  ')}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: font.ui,
                fontSize: 30,
                lineHeight: 36,
                fontWeight: '700',
                letterSpacing: -0.6,
                color: post.title.trim() ? t.text : t.textTertiary,
              }}
            >
              {post.title.trim() || 'untitled'}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginTop: 30,
                paddingBottom: 9,
                marginBottom: 26,
                borderBottomWidth: 1,
                borderColor: t.separator,
              }}
            >
              <Text
                style={{
                  fontFamily: font.ui,
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 0.4,
                  color: t.accentStrong,
                }}
              >
                {names[field]}
              </Text>
              <Text style={{ fontFamily: font.ui, fontSize: 12, color: t.textTertiary }}>
                {spoken
                  ? `${spoken.words} words  ·  about ${spoken.clock} read aloud`
                  : `${text.length} chars`}
              </Text>
            </View>

            {text.trim() ? (
              <MarkdownView source={text} scale={scale} />
            ) : (
              <Text style={{ fontFamily: font.ui, fontSize: 15, lineHeight: 23, color: t.textTertiary }}>
                {field === 'script'
                  ? 'no script yet — press esc and write one in the editor panel.'
                  : `no ${names.body} yet — press esc and write one in the editor panel.`}
              </Text>
            )}
          </View>
        </ScrollView>

        {showSide ? (
          <ScrollView
            style={{ flexGrow: 0, width: 340, borderLeftWidth: 1, borderColor: t.separator }}
            contentContainerStyle={{ padding: 18, gap: 20 }}
          >
            {scripted ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Label>{names[other]}</Label>
                  <View style={{ marginBottom: 5 }}>
                    <CopyCaptionButton body={post[other]} what={names[other]} />
                  </View>
                </View>
                <View
                  style={{
                    borderRadius: radius.md - 2,
                    borderWidth: 1,
                    borderColor: t.separator,
                    backgroundColor: t.field,
                    padding: 11,
                  }}
                >
                  <MarkdownView source={post[other]} />
                </View>
              </View>
            ) : null}

            {post.tags.length > 0 ? (
              <View>
                <Label>tags</Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {post.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: radius.md,
                        backgroundColor: t.accentSoft,
                      }}
                    >
                      <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.accentStrong }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {post.links.length > 0 ? (
              <View>
                <Label>reference links</Label>
                <View style={{ gap: 6 }}>
                  {post.links.map((url, i) => (
                    <Text
                      key={`${url}-${i}`}
                      numberOfLines={1}
                      accessibilityRole="link"
                      onPress={() => Linking.openURL(url).catch(() => {})}
                      style={{
                        fontFamily: font.ui,
                        fontSize: 12,
                        color: t.accentStrong,
                        textDecorationLine: 'underline',
                      }}
                    >
                      {url.replace(/^https?:\/\/(www\.)?/, '')}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            {post.error ? (
              <View style={{ padding: 9, borderRadius: radius.md, backgroundColor: 'rgba(255,69,58,0.14)' }}>
                <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>{post.error}</Text>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
