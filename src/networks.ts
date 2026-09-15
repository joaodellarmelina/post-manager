import type { Network, PostType } from './api';

/**
 * Which networks a post can target and what each one publishes. Formats in
 * SCRIPTED are video-ish and carry a script next to the caption.
 *
 * Mirror of electron/networks.js — the renderer bundle is compiled and cannot
 * require that file. Change both together.
 */
export const NETWORKS = ['instagram', 'linkedin', 'youtube', 'tiktok'] as const;
export const DEFAULT_NETWORK: Network = 'instagram';

export const FORMATS: Record<Network, readonly PostType[]> = {
  instagram: ['feed', 'reels', 'carousel', 'stories'],
  linkedin: ['post', 'article', 'carousel', 'video'],
  youtube: ['video', 'short', 'live'],
  tiktok: ['video', 'carousel', 'live'],
};

const SCRIPTED: Record<Network, readonly PostType[]> = {
  instagram: ['reels', 'stories'],
  linkedin: ['video'],
  youtube: ['video', 'short', 'live'],
  tiktok: ['video', 'live'],
};

export const NETWORK_LABEL: Record<string, string> = {
  instagram: 'instagram',
  linkedin: 'linkedin',
  youtube: 'youtube',
  tiktok: 'tiktok',
};

export const FORMAT_LABEL: Record<string, string> = {
  feed: 'feed',
  reels: 'reels',
  carousel: 'carousel',
  stories: 'stories',
  post: 'post',
  article: 'article',
  video: 'video',
  short: 'short',
  live: 'live',
};

/** Every format across networks, once each, in catalogue order. */
export const ALL_FORMATS: readonly PostType[] = Array.from(
  new Set(NETWORKS.flatMap((n) => FORMATS[n])),
);

export function defaultFormat(network: Network): PostType {
  return FORMATS[network][0];
}

export function hasScript(network: Network, type: PostType) {
  return SCRIPTED[network].includes(type);
}

/** YouTube titles are the one field with a hard, visible limit. */
export const YOUTUBE_TITLE_LIMIT = 100;
