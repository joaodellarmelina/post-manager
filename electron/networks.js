'use strict';

/**
 * Which networks a post can target and what each one publishes. Formats
 * flagged in SCRIPTED are video-ish and carry a script next to the caption.
 *
 * Mirrored in src/networks.ts for the renderer, the same way STATUSES and
 * the type list are: the bundle is compiled and cannot require this file.
 * Change both together.
 */
const NETWORKS = ['instagram', 'linkedin', 'youtube', 'tiktok'];
const DEFAULT_NETWORK = 'instagram';

const FORMATS = {
  instagram: ['feed', 'reels', 'carousel', 'stories'],
  linkedin: ['post', 'article', 'carousel', 'video'],
  youtube: ['video', 'short', 'live'],
  tiktok: ['video', 'carousel', 'live'],
};

const SCRIPTED = {
  instagram: ['reels', 'stories'],
  linkedin: ['video'],
  youtube: ['video', 'short', 'live'],
  tiktok: ['video', 'live'],
};

function defaultFormat(network) {
  return FORMATS[network]?.[0] ?? FORMATS[DEFAULT_NETWORK][0];
}

function hasScript(network, type) {
  return (SCRIPTED[network] ?? []).includes(type);
}

module.exports = { NETWORKS, DEFAULT_NETWORK, FORMATS, SCRIPTED, defaultFormat, hasScript };
