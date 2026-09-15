'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { VAULT_DIR } = require('./posts');

/**
 * Quick links live next to the posts, in `links.md`, so they travel with the
 * folder and can be edited by anything. One markdown list item per link:
 *
 *   - [figma](https://figma.com)
 *
 * Only http(s) URLs are kept; anything else in the file is ignored, so notes
 * and headings around the list are fine.
 */
const LINKS_FILE = 'links.md';
const LINKS_PATH = path.join(VAULT_DIR, LINKS_FILE);

const LINK_RE = /^\s*[-*+]\s+\[([^\]]+)\]\(\s*(https?:\/\/[^\s)]+)\s*\)/;

const SEED =
  '# quick links\n\n' +
  'these show up in the toolbar. one per line, as a markdown link — edit,\n' +
  'reorder or delete freely; the app follows the file.\n\n' +
  '- [figma](https://www.figma.com)\n' +
  '- [capcut](https://www.capcut.com)\n' +
  '- [instagram](https://www.instagram.com)\n';

function parseLinks(raw) {
  const out = [];
  const seen = new Set();
  for (const line of String(raw).split(/\r?\n/)) {
    const m = LINK_RE.exec(line);
    if (!m) continue;
    const label = m[1].trim();
    const url = m[2];
    if (!label || seen.has(url)) continue;
    seen.add(url);
    out.push({ label, url });
  }
  return out;
}

async function listLinks() {
  try {
    return parseLinks(await fs.readFile(LINKS_PATH, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/** Writes the template once so people find the file by opening the folder. */
async function seedIfMissing() {
  await fs.mkdir(VAULT_DIR, { recursive: true });
  try {
    await fs.writeFile(LINKS_PATH, SEED, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

module.exports = { LINKS_FILE, LINKS_PATH, parseLinks, listLinks, seedIfMissing };
