'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const matter = require('gray-matter');
const { VAULT_DIR, atomicWrite, todayISO } = require('./posts');
const { NETWORKS, FORMATS, SCRIPTED } = require('./networks');

/**
 * The creator profile, written by the onboarding and read by whatever agent
 * opens the folder. Three files:
 *
 *   instructions.md   answers as frontmatter + a prompt rendered from them,
 *                     in the language the user writes in
 *   AGENTS.md         how the folder works: file format, networks, rules
 *   CLAUDE.md         same content — different agents look for different names
 *
 * The frontmatter is the source of truth; re-running the onboarding reads it
 * back and rewrites all three. AGENTS.md and CLAUDE.md are derived, not edited.
 */
const INSTRUCTIONS = path.join(VAULT_DIR, 'instructions.md');
const AGENTS = path.join(VAULT_DIR, 'AGENTS.md');
const CLAUDE = path.join(VAULT_DIR, 'CLAUDE.md');

const LANGUAGES = ['pt', 'en'];
const TEXT_FIELDS = ['who', 'audience', 'pillars', 'voice', 'goal', 'avoid', 'references'];

const PARSE_OPTIONS = Object.freeze({});

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAnswers(raw) {
  const a = raw ?? {};
  const out = {
    language: LANGUAGES.includes(a.language) ? a.language : 'pt',
    networks: Array.isArray(a.networks) ? a.networks.filter((n) => NETWORKS.includes(n)) : [],
  };
  for (const f of TEXT_FIELDS) out[f] = clean(a[f]);
  return out;
}

async function readAnswers() {
  let raw;
  try {
    raw = await fs.readFile(INSTRUCTIONS, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { answers: null };
    throw err;
  }
  try {
    const parsed = matter(raw, PARSE_OPTIONS);
    return { answers: normalizeAnswers(parsed.data) };
  } catch (err) {
    return { answers: null, error: `instructions.md has invalid YAML: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// Rendering

/** One line per network: "instagram: feed, reels (script), …". */
function formatLines(networks, scriptWord) {
  return networks.map((n) => {
    const formats = FORMATS[n].map((f) =>
      SCRIPTED[n].includes(f) ? `${f} (${scriptWord})` : f,
    );
    return `- **${n}**: ${formats.join(', ')}`;
  });
}

function section(title, body) {
  return body ? `## ${title}\n\n${body}\n` : '';
}

function firstName(who) {
  const m = /^[^,;:(—–-]+/.exec(who);
  return m ? m[0].trim() : '';
}

function renderPt(a) {
  const nets = a.networks.length ? a.networks : NETWORKS;
  const name = firstName(a.who);
  return [
    `# instruções para criar conteúdo${name ? ` — ${name}` : ''}\n`,
    'Este arquivo descreve quem cria os posts desta pasta e como eles devem soar. Leia antes de',
    'escrever qualquer coisa aqui. O formato dos arquivos está em `AGENTS.md`.\n',
    section('quem escreve', a.who),
    section('para quem', a.audience),
    section('pilares de conteúdo', a.pillars),
    section('tom de voz', a.voice),
    section('objetivo dos posts', a.goal),
    section('o que evitar', a.avoid),
    section('referências', a.references),
    section(
      'redes e formatos',
      `Os posts são publicados em: ${nets.join(', ')}.\n\n${formatLines(nets, 'com roteiro').join('\n')}`,
    ),
    section(
      'ao escrever um post',
      [
        '- Um post por arquivo, no formato descrito em `AGENTS.md`, com `status: draft`.',
        '- A caption vai no corpo; em formatos com roteiro, o roteiro vai depois de uma linha `## script`.',
        '- Roteiro é fala: frases curtas, primeira pessoa, sem cabeçalhos além do próprio `## script`.',
        '- Escreva em português, salvo pedido contrário.',
        '- Comece pelo gancho: a primeira linha precisa segurar quem está rolando o feed.',
        '- Termine com um convite claro (comentar, salvar, seguir, clicar), um só.',
        '- Respeite o tom acima; na dúvida, mais direto e menos adjetivo.',
        '- Não invente fatos, números ou citações. Se faltar informação, deixe `[confirmar: …]`.',
      ].join('\n'),
    ),
    section(
      'checklist antes de entregar',
      [
        '- [ ] gancho na primeira linha',
        '- [ ] soa como a pessoa descrita em "tom de voz"',
        '- [ ] nada da lista "o que evitar"',
        '- [ ] um convite só, no fim',
        '- [ ] frontmatter completo e válido',
      ].join('\n'),
    ),
  ]
    .filter(Boolean)
    .join('\n');
}

function renderEn(a) {
  const nets = a.networks.length ? a.networks : NETWORKS;
  const name = firstName(a.who);
  return [
    `# instructions for creating content${name ? ` — ${name}` : ''}\n`,
    'This file describes who writes the posts in this folder and how they should sound. Read',
    'it before writing anything here. The file format lives in `AGENTS.md`.\n',
    section('who writes', a.who),
    section('for whom', a.audience),
    section('content pillars', a.pillars),
    section('voice', a.voice),
    section('what posts should achieve', a.goal),
    section('what to avoid', a.avoid),
    section('references', a.references),
    section(
      'networks and formats',
      `Posts go out on: ${nets.join(', ')}.\n\n${formatLines(nets, 'with script').join('\n')}`,
    ),
    section(
      'when writing a post',
      [
        '- One post per file, in the format described in `AGENTS.md`, with `status: draft`.',
        '- The caption is the body; scripted formats put the script after a `## script` line.',
        '- A script is speech: short sentences, first person, no headings besides `## script` itself.',
        '- Write in English unless told otherwise.',
        '- Lead with the hook: the first line has to stop the scroll.',
        '- End with one clear ask (comment, save, follow, click) — just one.',
        '- Keep the voice above; when unsure, more direct and fewer adjectives.',
        '- Never invent facts, numbers or quotes. When information is missing, leave `[confirm: …]`.',
      ].join('\n'),
    ),
    section(
      'checklist before handing over',
      [
        '- [ ] hook on the first line',
        '- [ ] sounds like the person under "voice"',
        '- [ ] nothing from "what to avoid"',
        '- [ ] a single ask, at the end',
        '- [ ] complete, valid frontmatter',
      ].join('\n'),
    ),
  ]
    .filter(Boolean)
    .join('\n');
}

/** AGENTS.md / CLAUDE.md: the folder's contract, in English like those files usually are. */
function renderAgents() {
  const table = NETWORKS.map((n) => {
    const scripted = SCRIPTED[n].join(', ') || '—';
    return `| ${n} | ${FORMATS[n].join(' · ')} | ${scripted} |`;
  });
  return `<!-- generated by post manager's onboarding; rerun it (File → Onboarding…) instead of editing -->

# post manager — how this folder works

Read \`instructions.md\` first: it says who the creator is, who they write for,
how they sound and what to avoid. This file only covers the mechanics.

## files

- Every post is one markdown file named \`YYYY-MM-DD-slug.md\`. The app renames it
  from the date and title on save, so the slug does not have to be perfect.
- \`links.md\`, \`instructions.md\`, \`AGENTS.md\` and \`CLAUDE.md\` are not posts. Leave them alone
  unless asked.
- Files starting with \`.\` are ignored.

## post format

\`\`\`markdown
---
title: 'three things that changed in v2'
date: '2026-09-20'            # YYYY-MM-DD
time: '18:00'                 # HH:mm, 24h
status: draft                 # draft | ready | published — new posts are draft
network: instagram            # ${NETWORKS.join(' | ')}
type: reels                   # one of the network's formats, see below
tags: ['#dev', '#product']    # keep the #
links:                        # reference urls, optional
  - 'https://example.com/the-article'
---
the caption, in markdown. this is what gets published as text.

## script

only for scripted formats: what is said on camera. speech, not prose.
\`\`\`

- Quote \`title\`, \`date\` and \`time\` — unquoted dates turn into YAML date objects.
- Use \`##\` inside the caption freely, but \`## script\` alone on a line is the separator.
- The caption of an instagram post should stay under 2,200 characters; a youtube title under 100.

## networks and formats

| network | formats | with script |
|---|---|---|
${table.join('\n')}

## rules

- One post per file. To propose several, write several files.
- New posts are \`status: draft\`; only the creator marks them ready or published.
- Do not delete or rename existing posts; edit in place. The app watches the folder and
  picks up changes instantly.
- Never invent facts, numbers or quotes; leave \`[confirm: …]\` where something must be checked.
`;
}

function serialize(a) {
  const body = a.language === 'en' ? renderEn(a) : renderPt(a);
  const data = {
    language: a.language,
    networks: a.networks,
  };
  for (const f of TEXT_FIELDS) data[f] = a[f];
  data.updated = todayISO();
  return matter.stringify(body, data, { flowLevel: 1 });
}

async function writeAll(raw) {
  const a = normalizeAnswers(raw);
  await fs.mkdir(VAULT_DIR, { recursive: true });
  const agents = renderAgents();
  await atomicWrite(INSTRUCTIONS, serialize(a));
  await atomicWrite(AGENTS, agents);
  await atomicWrite(CLAUDE, agents);
  return a;
}

module.exports = {
  INSTRUCTIONS,
  LANGUAGES,
  TEXT_FIELDS,
  normalizeAnswers,
  readAnswers,
  writeAll,
  renderPt,
  renderEn,
  renderAgents,
  serialize,
};
