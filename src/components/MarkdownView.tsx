import React from 'react';
import { Linking, Text, View } from 'react-native';
import { marked, type Token, type Tokens } from 'marked';
import { font, radius, useTheme, type Theme } from '../theme';

/**
 * Renders Markdown as React Native elements.
 *
 * Deliberately never produces HTML: post bodies come from files on disk that
 * anything can write, and this renderer runs in a context that can reach
 * `window.vault`. Mapping tokens straight to components makes script injection
 * impossible rather than merely sanitized.
 */

const HEADING_SIZE = [20, 17, 15, 14, 13, 13];

function inlineKey(i: number) {
  return `i${i}`;
}

/** Inline tokens render as nested <Text>, which RN composes into one line flow. */
function renderInline(tokens: Token[] | undefined, t: Theme, raw?: string): React.ReactNode {
  if (!tokens || tokens.length === 0) return raw ?? null;

  return tokens.map((tk, i) => {
    switch (tk.type) {
      case 'strong':
        return (
          <Text key={inlineKey(i)} style={{ fontWeight: '600' }}>
            {renderInline((tk as Tokens.Strong).tokens, t, (tk as Tokens.Strong).text)}
          </Text>
        );
      case 'em':
        return (
          <Text key={inlineKey(i)} style={{ fontStyle: 'italic' }}>
            {renderInline((tk as Tokens.Em).tokens, t, (tk as Tokens.Em).text)}
          </Text>
        );
      case 'del':
        return (
          <Text key={inlineKey(i)} style={{ textDecorationLine: 'line-through' }}>
            {renderInline((tk as Tokens.Del).tokens, t, (tk as Tokens.Del).text)}
          </Text>
        );
      case 'codespan':
        return (
          <Text
            key={inlineKey(i)}
            style={{
              fontFamily: font.mono,
              fontSize: 12,
              backgroundColor: t.field,
              color: t.accentStrong,
            }}
          >
            {(tk as Tokens.Codespan).text}
          </Text>
        );
      case 'link': {
        const link = tk as Tokens.Link;
        return (
          <Text
            key={inlineKey(i)}
            style={{ color: t.accentStrong, textDecorationLine: 'underline' }}
            onPress={() => {
              // Opens in the default browser via the main process' window handler.
              if (/^https?:/i.test(link.href)) Linking.openURL(link.href).catch(() => {});
            }}
          >
            {renderInline(link.tokens, t, link.text)}
          </Text>
        );
      }
      case 'br':
        return <Text key={inlineKey(i)}>{'\n'}</Text>;
      case 'escape':
        return <Text key={inlineKey(i)}>{(tk as Tokens.Escape).text}</Text>;
      case 'html':
        // Shown as literal text, never interpreted.
        return <Text key={inlineKey(i)}>{(tk as Tokens.HTML).raw}</Text>;
      default:
        return (
          <Text key={inlineKey(i)}>
            {(tk as Tokens.Text).tokens
              ? renderInline((tk as Tokens.Text).tokens, t, (tk as Tokens.Text).text)
              : ((tk as Tokens.Text).text ?? tk.raw)}
          </Text>
        );
    }
  });
}

function Paragraph({ children, t }: { children: React.ReactNode; t: Theme }) {
  return (
    <Text style={{ fontFamily: font.ui, fontSize: 13, lineHeight: 20, color: t.text }}>
      {children}
    </Text>
  );
}

function renderBlocks(tokens: Token[], t: Theme, depth = 0): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  tokens.forEach((tk, i) => {
    const key = `b${depth}-${i}`;
    switch (tk.type) {
      case 'space':
        break;

      case 'heading': {
        const h = tk as Tokens.Heading;
        out.push(
          <Text
            key={key}
            style={{
              fontFamily: font.ui,
              fontSize: HEADING_SIZE[Math.min(h.depth, 6) - 1],
              fontWeight: '600',
              letterSpacing: -0.2,
              color: t.text,
              marginTop: i === 0 ? 0 : 6,
            }}
          >
            {renderInline(h.tokens, t, h.text)}
          </Text>,
        );
        break;
      }

      case 'paragraph':
        out.push(
          <Paragraph key={key} t={t}>
            {renderInline((tk as Tokens.Paragraph).tokens, t, (tk as Tokens.Paragraph).text)}
          </Paragraph>,
        );
        break;

      case 'list': {
        const list = tk as Tokens.List;
        out.push(
          <View key={key} style={{ gap: 3 }}>
            {list.items.map((item, n) => (
              <View key={n} style={{ flexDirection: 'row', gap: 7 }}>
                <Text
                  style={{
                    fontFamily: font.ui,
                    fontSize: 13,
                    lineHeight: 20,
                    color: t.textSecondary,
                    minWidth: list.ordered ? 16 : 8,
                  }}
                >
                  {list.ordered ? `${(Number(list.start) || 1) + n}.` : '•'}
                </Text>
                <View style={{ flex: 1, gap: 3 }}>
                  {item.task ? (
                    <Text style={{ fontFamily: font.ui, fontSize: 13, color: t.textSecondary }}>
                      {item.checked ? '☑' : '☐'}{' '}
                      <Text style={{ color: t.text }}>{renderInline(item.tokens, t, item.text)}</Text>
                    </Text>
                  ) : (
                    renderBlocks(item.tokens as Token[], t, depth + 1)
                  )}
                </View>
              </View>
            ))}
          </View>,
        );
        break;
      }

      case 'blockquote':
        out.push(
          <View
            key={key}
            style={{
              borderLeftWidth: 2,
              borderColor: t.border,
              paddingLeft: 9,
              gap: 6,
            }}
          >
            {renderBlocks((tk as Tokens.Blockquote).tokens, t, depth + 1)}
          </View>,
        );
        break;

      case 'code':
        out.push(
          <View
            key={key}
            style={{ backgroundColor: t.field, borderRadius: radius.sm, padding: 9 }}
          >
            <Text style={{ fontFamily: font.mono, fontSize: 12, lineHeight: 18, color: t.text }}>
              {(tk as Tokens.Code).text}
            </Text>
          </View>,
        );
        break;

      case 'hr':
        out.push(<View key={key} style={{ height: 1, backgroundColor: t.separator }} />);
        break;

      case 'html':
        out.push(
          <Text
            key={key}
            style={{ fontFamily: font.mono, fontSize: 12, color: t.textSecondary }}
          >
            {(tk as Tokens.HTML).raw.trim()}
          </Text>,
        );
        break;

      default: {
        const any = tk as Tokens.Text;
        if (any.tokens || any.text) {
          out.push(
            <Paragraph key={key} t={t}>
              {renderInline(any.tokens, t, any.text)}
            </Paragraph>,
          );
        }
      }
    }
  });

  return out;
}

export function MarkdownView({ source }: { source: string }) {
  const t = useTheme();

  const blocks = React.useMemo(() => {
    if (!source.trim()) return null;
    try {
      return renderBlocks(marked.lexer(source), t);
    } catch {
      // A body that trips the lexer still has to be readable.
      return [
        <Paragraph key="raw" t={t}>
          {source}
        </Paragraph>,
      ];
    }
  }, [source, t]);

  if (!blocks) {
    return (
      <Text style={{ fontFamily: font.ui, fontSize: 13, color: t.textTertiary }}>
        nothing to preview yet
      </Text>
    );
  }

  return <View style={{ gap: 8 }}>{blocks}</View>;
}
