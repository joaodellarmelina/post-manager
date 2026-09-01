import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Post, PostDraft, PostType, Status } from '../api';
import { longDate } from '../dates';
import {
  font, radius, STATUS_COLOR, STATUS_LABEL, STATUSES, TYPE_LABEL, TYPES, useTheme,
} from '../theme';
import { MarkdownView } from './MarkdownView';
import { Field, IconButton, Label, Segmented } from './primitives';

const CAPTION_LIMIT = 2200;
const BODY_MODES = ['escrever', 'visualizar'] as const;
const BODY_MODE_LABELS = { escrever: 'escrever', visualizar: 'visualizar' };
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
              accessibilityLabel={`remover ${tag}`}
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
        placeholder="adicionar tag e pressionar enter"
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
  const [bodyMode, setBodyMode] = useState<(typeof BODY_MODES)[number]>('escrever');
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
    state === 'saving' ? 'salvando…'
    : state === 'saved' ? 'salvo'
    : state === 'dirty' ? 'editando…'
    : state === 'error' ? 'erro ao salvar'
    : state === 'invalid' ? 'data ou hora inválida'
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
        <IconButton label="✕" onPress={onClose} accessibilityLabel="fechar painel" />
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: font.ui, fontSize: 12, color: t.textSecondary }}
        >
          {filenameRef.current ?? 'novo post'}
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
        <IconButton label="⋯" onPress={onReveal} accessibilityLabel="mostrar no finder" />
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
          <Label>título</Label>
          <Field
            value={draft.title}
            onChangeText={(v) => update({ title: v })}
            placeholder="título da postagem"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Label>data</Label>
            <Field
              value={draft.date}
              onChangeText={(v) => update({ date: v })}
              placeholder="aaaa-mm-dd"
              mono
              invalid={!isRealDate(draft.date)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>hora</Label>
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
          {isRealDate(draft.date) ? longDate(draft.date) : 'data inválida — use aaaa-mm-dd'}
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
          <Label>formato</Label>
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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <Label>legenda</Label>
            <View style={{ width: 168 }}>
              <Segmented
                options={BODY_MODES}
                value={bodyMode}
                onChange={setBodyMode}
                labels={BODY_MODE_LABELS}
              />
            </View>
          </View>

          {bodyMode === 'escrever' ? (
            <Field
              value={draft.body}
              onChangeText={(v) => update({ body: v })}
              placeholder="escreva a legenda, copy ou roteiro em markdown…"
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
            mover para o lixo
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
