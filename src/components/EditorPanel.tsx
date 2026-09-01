import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { Post, PostDraft, PostType, Status } from '../api';
import { longDate } from '../dates';
import {
  font, radius, STATUS_COLOR, STATUS_LABEL, STATUSES, TYPE_LABEL, TYPES, useTheme,
} from '../theme';
import { MarkdownView } from './MarkdownView';
import { Field, IconButton, Label, Segmented } from './primitives';

const CAPTION_LIMIT = 2200;
const BODY_MODES = ['write', 'preview'] as const;
const BODY_MODE_LABELS = { write: 'write', preview: 'preview' };
const AUTOSAVE_MS = 800;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A real calendar day, so 2026-02-31 is rejected too. */
function isRealDate(iso: string) {
  if (!DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'invalid';

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const t = useTheme();
  const [text, setText] = useState('');

  const commit = useCallback(() => {
    const raw = text.trim().replace(/,$/, '');
    if (!raw) return;
    const tag = raw.startsWith('#') ? raw : `#${raw}`;
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setText('');
  }, [text, tags, onChange]);

  return (
    <View style={{ gap: 6 }}>
      {tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onChange(tags.filter((x) => x !== tag))}
              accessibilityLabel={`remove ${tag}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: radius.md,
                backgroundColor: t.accentSoft,
              }}
            >
              <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: t.accentStrong }}>{tag}</Text>
              <Text style={{ fontFamily: font.ui, fontSize: 11, color: t.accentStrong, opacity: 0.7 }}>
                ×
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field
        value={text}
        onChangeText={(v) => {
          if (v.endsWith(',')) {
            setText(v);
            setTimeout(commit, 0);
          } else setText(v);
        }}
        placeholder="add a tag and press enter"
        onKeyPress={(e: any) => {
          if (e.nativeEvent?.key === 'Enter') {
            e.preventDefault?.();
            commit();
          } else if (e.nativeEvent?.key === 'Backspace' && !text && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
      />
    </View>
  );
}

/** Normalises what people actually paste: bare domains become https URLs. */
function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith('mailto:')) return url;
  return `https://${url}`;
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinksField({ links, onChange }: { links: string[]; onChange: (l: string[]) => void }) {
  const t = useTheme();
  const [text, setText] = useState('');

  const add = useCallback(() => {
    const url = normalizeUrl(text);
    if (!url) return;
    if (!links.includes(url)) onChange([...links, url]);
    setText('');
  }, [text, links, onChange]);

  return (
    <View style={{ gap: 6 }}>
      {links.map((url, i) => (
        <View
          key={`${url}-${i}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: radius.md - 2,
            backgroundColor: t.field,
            borderWidth: 1,
            borderColor: t.separator,
          }}
        >
          <Text
            numberOfLines={1}
            accessibilityRole="link"
            onPress={() => Linking.openURL(url).catch(() => {})}
            style={{
              flex: 1,
              fontFamily: font.ui,
              fontSize: 12,
              color: t.accentStrong,
              textDecorationLine: 'underline',
            }}
          >
            {hostOf(url)}
            <Text style={{ color: t.textTertiary, textDecorationLine: 'none' }}>
              {'  '}
              {url.replace(/^https?:\/\/(www\.)?/, '').slice(hostOf(url).length) || ''}
            </Text>
          </Text>
          <Pressable
            onPress={() => onChange(links.filter((_, n) => n !== i))}
            accessibilityLabel={`remove ${url}`}
            hitSlop={6}
          >
            <Text style={{ fontFamily: font.ui, fontSize: 13, color: t.textTertiary }}>×</Text>
          </Pressable>
        </View>
      ))}

      <Field
        value={text}
        onChangeText={setText}
        placeholder="paste a link and press enter"
        onKeyPress={(e: any) => {
          if (e.nativeEvent?.key === 'Enter') {
            e.preventDefault?.();
            add();
          } else if (e.nativeEvent?.key === 'Backspace' && !text && links.length) {
            onChange(links.slice(0, -1));
          }
        }}
      />
    </View>
  );
}

export function EditorPanel({
  post,
  onSave,
  onDelete,
  onClose,
  onReveal,
  registerSave,
}: {
  post: Post;
  onSave: (filename: string | null, draft: PostDraft) => Promise<Post>;
  onDelete: () => void;
  onClose: () => void;
  onReveal: () => void;
  /** Lets the parent trigger a save from the Cmd+S menu accelerator. */
  registerSave: (fn: () => void) => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState<PostDraft>(post);
  const [state, setState] = useState<SaveState>('idle');
  const [bodyMode, setBodyMode] = useState<(typeof BODY_MODES)[number]>('write');
  const [message, setMessage] = useState<string | null>(null);

  // `filename` changes under us when a save renames the file.
  const filenameRef = useRef<string | null>(post.filename || null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(draft);
  latest.current = draft;

  // Re-seed when a different post is opened, or when this one changed on disk.
  useEffect(() => {
    setDraft(post);
    filenameRef.current = post.filename || null;
    setState('idle');
    setMessage(null);
  }, [post.filename, post.title, post.date, post.time, post.status, post.type, post.body]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // Refuse to save a malformed date/time: savePost would silently coerce it
    // to today and rename the file, losing what the user meant.
    if (!isRealDate(latest.current.date) || !TIME_RE.test(latest.current.time)) {
      setState('invalid');
      return;
    }
    setState('saving');
    try {
      const saved = await onSave(filenameRef.current, latest.current);
      filenameRef.current = saved.filename;
      setState('saved');
      setMessage(null);
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [onSave]);

  useEffect(() => {
    registerSave(flush);
  }, [registerSave, flush]);

  const update = useCallback(
    (patch: Partial<PostDraft>) => {
      setDraft((d) => ({ ...d, ...patch }));
      setState('dirty');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush],
  );

  // Save any pending edit when the panel unmounts.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        const d = latest.current;
        if (isRealDate(d.date) && TIME_RE.test(d.time)) {
          onSave(filenameRef.current, d).catch(() => {});
        }
      }
    },
    [onSave],
  );

  const over = draft.body.length > CAPTION_LIMIT;

  const statusText =
    state === 'saving' ? 'saving…'
    : state === 'saved' ? 'saved'
    : state === 'dirty' ? 'editing…'
    : state === 'error' ? 'save failed'
    : state === 'invalid' ? 'invalid date or time'
    : '';

  return (
    <View
      style={{
        width: 420,
        backgroundColor: t.panelSolid,
        borderLeftWidth: 1,
        borderColor: t.separator,
      }}
    >
      <View
        style={{
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          gap: 6,
          borderBottomWidth: 1,
          borderColor: t.separator,
        }}
      >
        <IconButton label="✕" onPress={onClose} accessibilityLabel="close panel" />
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: font.ui, fontSize: 12, color: t.textSecondary }}
        >
          {filenameRef.current ?? 'new post'}
        </Text>
        <Text
          style={{
            fontFamily: font.ui,
            fontSize: 11.5,
            color: state === 'error' || state === 'invalid' ? '#FF453A' : t.textSecondary,
          }}
        >
          {statusText}
        </Text>
        <IconButton label="⋯" onPress={onReveal} accessibilityLabel="reveal in finder" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 14 }}>
        {post.error ? (
          <View
            style={{
              padding: 9,
              borderRadius: radius.md,
              backgroundColor: 'rgba(255,69,58,0.14)',
            }}
          >
            <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>
              {post.error}
            </Text>
          </View>
        ) : null}
        {message ? (
          <View
            style={{ padding: 9, borderRadius: radius.md, backgroundColor: 'rgba(255,69,58,0.14)' }}
          >
            <Text style={{ fontFamily: font.ui, fontSize: 11.5, color: '#FF453A' }}>{message}</Text>
          </View>
        ) : null}

        <View>
          <Label>title</Label>
          <Field
            value={draft.title}
            onChangeText={(v) => update({ title: v })}
            placeholder="post title"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Label>date</Label>
            <Field
              value={draft.date}
              onChangeText={(v) => update({ date: v })}
              placeholder="yyyy-mm-dd"
              mono
              invalid={!isRealDate(draft.date)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>time</Label>
            <Field
              value={draft.time}
              onChangeText={(v) => update({ time: v })}
              placeholder="hh:mm"
              mono
              invalid={!TIME_RE.test(draft.time)}
            />
          </View>
        </View>
        <Text
          style={{
            fontFamily: font.ui,
            fontSize: 11,
            color: isRealDate(draft.date) ? t.textTertiary : '#FF453A',
            marginTop: -8,
          }}
        >
          {isRealDate(draft.date) ? longDate(draft.date) : 'invalid date — use yyyy-mm-dd'}
        </Text>

        <View>
          <Label>status</Label>
          <Segmented<Status>
            options={STATUSES}
            value={draft.status}
            onChange={(v) => update({ status: v })}
            labels={STATUS_LABEL}
            colors={STATUS_COLOR}
          />
        </View>

        <View>
          <Label>format</Label>
          <Segmented<PostType>
            options={TYPES}
            value={draft.type}
            onChange={(v) => update({ type: v })}
            labels={TYPE_LABEL}
          />
        </View>

        <View>
          <Label>tags</Label>
          <TagInput tags={draft.tags} onChange={(tags) => update({ tags })} />
        </View>

        <View>
          <Label>reference links</Label>
          <LinksField links={draft.links} onChange={(links) => update({ links })} />
        </View>

        <View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <Label>caption</Label>
            <View style={{ width: 168 }}>
              <Segmented
                options={BODY_MODES}
                value={bodyMode}
                onChange={setBodyMode}
                labels={BODY_MODE_LABELS}
              />
            </View>
          </View>

          {bodyMode === 'write' ? (
            <Field
              value={draft.body}
              onChangeText={(v) => update({ body: v })}
              placeholder="write the caption, copy or script in markdown…"
              multiline
              mono
              style={{ minHeight: 260, textAlignVertical: 'top' } as any}
            />
          ) : (
            <View
              style={{
                minHeight: 260,
                borderRadius: radius.md - 2,
                borderWidth: 1,
                borderColor: t.separator,
                backgroundColor: t.field,
                paddingHorizontal: 9,
                paddingVertical: 9,
              }}
            >
              <MarkdownView source={draft.body} />
            </View>
          )}

          <Text
            style={{
              fontFamily: font.ui,
              fontSize: 11,
              color: over ? '#FF453A' : t.textTertiary,
              alignSelf: 'flex-end',
              marginTop: 5,
            }}
          >
            {draft.body.length} / {CAPTION_LIMIT}
          </Text>
        </View>

        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          style={{ alignSelf: 'flex-start', paddingVertical: 5 }}
        >
          <Text style={{ fontFamily: font.ui, fontSize: 12, color: '#FF453A' }}>
            move to trash
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
