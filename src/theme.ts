import { createContext, useContext } from 'react';

/**
 * Two token sets, one shape. Panels are translucent so the window vibrancy
 * shows through; only the window background stays fully transparent.
 */
type Scheme = 'light' | 'dark';

const light = {
  scheme: 'light' as Scheme,
  panel: 'rgba(255,255,255,0.72)',
  panelSolid: 'rgba(250,250,252,0.94)',
  raised: 'rgba(255,255,255,0.86)',
  hover: 'rgba(0,0,0,0.045)',
  active: 'rgba(0,0,0,0.08)',
  text: '#1d1d1f',
  textSecondary: '#86868b',
  textTertiary: '#aeaeb2',
  separator: 'rgba(0,0,0,0.08)',
  border: 'rgba(0,0,0,0.10)',
  accent: '#007AFF',
  accentStrong: '#0063CC', // accent text over accentSoft, which #007AFF fails
  accentSoft: 'rgba(0,122,255,0.12)',
  field: 'rgba(255,255,255,0.75)',
  todayText: '#ffffff',
  shadow: 'rgba(0,0,0,0.12)',
};

const dark: typeof light = {
  scheme: 'dark',
  panel: 'rgba(40,40,42,0.66)',
  panelSolid: 'rgba(30,30,32,0.94)',
  raised: 'rgba(58,58,60,0.72)',
  hover: 'rgba(255,255,255,0.07)',
  active: 'rgba(255,255,255,0.12)',
  text: '#f5f5f7',
  textSecondary: '#a1a1a6',
  textTertiary: '#8e8e93',
  separator: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.14)',
  accent: '#0A84FF',
  accentStrong: '#6BB6FF',
  accentSoft: 'rgba(10,132,255,0.22)',
  field: 'rgba(255,255,255,0.06)',
  todayText: '#ffffff',
  shadow: 'rgba(0,0,0,0.5)',
};

export type Theme = typeof light;

export const themes = { light, dark };

/**
 * The scheme is subscribed to ONCE at the root and shared through context.
 * Calling useColorScheme() in every cell left some subtrees with stale colors
 * when the system appearance changed, and spawned a listener per cell.
 */
export const ThemeContext = createContext<Theme>(light);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Status colors read the same in both appearances, so they are shared. */
export const STATUS_COLOR: Record<string, string> = {
  draft: '#8E8E93',
  ready: '#FF9F0A',
  published: '#30D158',
};

export const STATUS_LABEL: Record<string, string> = {
  draft: 'draft',
  ready: 'ready',
  published: 'published',
};

export const TYPE_LABEL: Record<string, string> = {
  feed: 'feed',
  reels: 'reels',
  carousel: 'carousel',
  stories: 'stories',
};

export const STATUSES = ['draft', 'ready', 'published'] as const;
export const TYPES = ['feed', 'reels', 'carousel', 'stories'] as const;

export const font = {
  ui: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace',
};

export const radius = { sm: 6, md: 10, lg: 14 };
