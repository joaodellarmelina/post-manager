'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const matter = require('gray-matter');

const VAULT_DIR = path.join(os.homedir(), 'Documents', 'post-manager');

const STATUSES = ['draft', 'ready', 'published'];
const TYPES = ['feed', 'reels', 'carrossel', 'stories'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Turns "Título da Postagem!" into "titulo-da-postagem". */
function slugify(input) {
  const slug = String(input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'sem-titulo';
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Rejects anything that could escape the vault directory. Every IPC handler
 * runs its filename through this before touching disk.
 */
function resolveInVault(filename) {
  if (typeof filename !== 'string' || !filename) throw new Error('Nome de arquivo inválido.');
  if (filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    throw new Error('Nome de arquivo inválido.');
  }
  if (!filename.endsWith('.md')) throw new Error('Apenas arquivos .md são permitidos.');
  const full = path.resolve(VAULT_DIR, filename);
  if (path.dirname(full) !== path.resolve(VAULT_DIR)) throw new Error('Caminho fora do vault.');
  return full;
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/** Coerces whatever YAML the user wrote into the shape the UI expects. */
function normalize(filename, parsed) {
  const d = parsed.data ?? {};
  const tags = Array.isArray(d.tags)
    ? d.tags.map((t) => String(t)).filter(Boolean)
    : typeof d.tags === 'string'
      ? d.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

  // A YAML date without quotes parses to a Date object; pull the ISO day back out.
  let date = d.date;
  if (date instanceof Date && !Number.isNaN(date.valueOf())) {
    date = date.toISOString().slice(0, 10);
  }
  date = typeof date === 'string' && DATE_RE.test(date) ? date : dateFromFilename(filename) ?? todayISO();

  let time = d.time;
  if (time instanceof Date && !Number.isNaN(time.valueOf())) {
    time = time.toISOString().slice(11, 16);
  }
  time = typeof time === 'string' && TIME_RE.test(time) ? time : '12:00';

  return {
    filename,
    title: typeof d.title === 'string' && d.title.trim() ? d.title : titleFromFilename(filename),
    date,
    time,
    status: oneOf(d.status, STATUSES, 'draft'),
    type: oneOf(d.type, TYPES, 'feed'),
    tags,
    body: parsed.content.replace(/^\n+/, ''),
    error: null,
  };
}

function dateFromFilename(filename) {
  const m = /^(\d{4}-\d{2}-\d{2})-/.exec(filename);
  return m ? m[1] : null;
}

function titleFromFilename(filename) {
  const base = filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return base.replace(/-/g, ' ') || 'sem título';
}

async function ensureDir() {
  await fs.mkdir(VAULT_DIR, { recursive: true });
}

async function readOne(filename) {
  const full = resolveInVault(filename);
  const raw = await fs.readFile(full, 'utf8');
  try {
    return normalize(filename, matter(raw));
  } catch (err) {
    // A single malformed file must not break the whole list.
    return {
      filename,
      title: titleFromFilename(filename),
      date: dateFromFilename(filename) ?? todayISO(),
      time: '12:00',
      status: 'draft',
      type: 'feed',
      tags: [],
      body: raw,
      error: `YAML inválido: ${err.message}`,
    };
  }
}

async function listPosts() {
  await ensureDir();
  const entries = await fs.readdir(VAULT_DIR, { withFileTypes: true });
  const names = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('.'))
    .map((e) => e.name);

  const posts = await Promise.all(
    names.map((name) =>
      readOne(name).catch((err) => ({
        filename: name,
        title: titleFromFilename(name),
        date: dateFromFilename(name) ?? todayISO(),
        time: '12:00',
        status: 'draft',
        type: 'feed',
        tags: [],
        body: '',
        error: err.message,
      })),
    ),
  );

  posts.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.filename.localeCompare(b.filename));
  return posts;
}

async function exists(full) {
  try {
    await fs.access(full);
    return true;
  } catch {
    return false;
  }
}

/** Finds a free `YYYY-MM-DD-slug.md`, appending -2, -3… on collision. */
async function uniqueFilename(date, title, currentFilename) {
  const base = `${date}-${slugify(title)}`;
  for (let i = 1; i < 500; i++) {
    const candidate = i === 1 ? `${base}.md` : `${base}-${i}.md`;
    if (candidate === currentFilename) return candidate;
    if (!(await exists(path.join(VAULT_DIR, candidate)))) return candidate;
  }
  return `${base}-${Date.now()}.md`;
}

function serialize(post) {
  return matter.stringify(
    post.body ?? '',
    {
      title: post.title ?? '',
      date: post.date,
      time: post.time,
      status: oneOf(post.status, STATUSES, 'draft'),
      type: oneOf(post.type, TYPES, 'feed'),
      tags: Array.isArray(post.tags) ? post.tags : [],
    },
    // flowLevel 1 keeps `tags: ['#tech', '#dev']` on one line, matching the
    // documented file format instead of a multi-line YAML block sequence.
    { flowLevel: 1 },
  );
}

/** Write-to-temp + rename, so a crash mid-write can never truncate a post. */
async function atomicWrite(full, contents) {
  const tmp = path.join(path.dirname(full), `.${path.basename(full)}.${process.pid}.tmp`);
  await fs.writeFile(tmp, contents, 'utf8');
  await fs.rename(tmp, full);
}

/**
 * Saves a post, renaming the file when the date or title changed.
 * Returns the (possibly new) filename so the renderer can track it.
 */
async function savePost(filename, data) {
  await ensureDir();
  const date = DATE_RE.test(data.date) ? data.date : todayISO();
  const time = TIME_RE.test(data.time) ? data.time : '12:00';
  const post = { ...data, date, time };

  const isNew = !filename;
  const current = isNew ? null : resolveInVault(filename);
  const desired = await uniqueFilename(date, post.title, filename || undefined);

  if (!isNew && desired !== filename) {
    await atomicWrite(current, serialize(post));
    const next = resolveInVault(desired);
    await fs.rename(current, next);
    return { ...post, filename: desired, error: null };
  }

  const target = resolveInVault(desired);
  await atomicWrite(target, serialize(post));
  return { ...post, filename: desired, error: null };
}

async function seedIfEmpty() {
  await ensureDir();
  const entries = await fs.readdir(VAULT_DIR);
  if (entries.some((n) => n.endsWith('.md'))) return;
  await savePost(null, {
    title: 'bem-vindo ao post manager',
    date: todayISO(),
    time: '18:00',
    status: 'draft',
    type: 'feed',
    tags: ['#exemplo'],
    body:
      'cada post é um arquivo markdown em ~/Documents/post-manager.\n\n' +
      'edite aqui ou no seu editor favorito — o app acompanha os dois lados.\n\n' +
      'cmd+n cria um post, cmd+s salva, cmd+w fecha este painel.',
  });
}

module.exports = {
  VAULT_DIR,
  STATUSES,
  TYPES,
  slugify,
  todayISO,
  resolveInVault,
  ensureDir,
  listPosts,
  readOne,
  savePost,
  seedIfEmpty,
};
