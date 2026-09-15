export type Status = 'draft' | 'ready' | 'published';
export type Network = 'instagram' | 'linkedin' | 'youtube' | 'tiktok';
/** Every format any network publishes; which ones apply is in src/networks.ts. */
export type PostType =
  | 'feed' | 'reels' | 'carousel' | 'stories'
  | 'post' | 'article' | 'video' | 'short' | 'live';

export interface Post {
  filename: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: Status;
  /** One network per post; the format list depends on it. */
  network: Network;
  type: PostType;
  tags: string[];
  /** Reference links; a post can carry any number of them. */
  links: string[];
  /** The caption (or description, on youtube). */
  body: string;
  /** What gets read on camera; stored after a `## script` heading in the file. */
  script: string;
  error: string | null;
}

export type PostDraft = Omit<Post, 'filename' | 'error'>;

export type Language = 'pt' | 'en';

/** The creator profile the onboarding collects; frontmatter of `instructions.md`. */
export interface Answers {
  language: Language;
  networks: Network[];
  who: string;
  audience: string;
  pillars: string;
  voice: string;
  goal: string;
  avoid: string;
  references: string;
}

/** A toolbar shortcut to an external tool, from `links.md` in the vault. */
export interface QuickLink {
  label: string;
  url: string;
}

type MenuAction =
  | 'new' | 'save' | 'close-panel' | 'today' | 'delete'
  | 'search' | 'prev-month' | 'next-month' | 'toggle-sidebar' | 'shortcuts' | 'toggle-view'
  | 'edit-links' | 'onboarding' | 'profile';

interface VaultBridge {
  list(): Promise<Post[]>;
  read(filename: string): Promise<Post>;
  save(filename: string | null, data: PostDraft): Promise<Post>;
  remove(filename: string): Promise<boolean>;
  reveal(filename?: string): Promise<boolean>;
  getDir(): Promise<string>;
  listLinks(): Promise<QuickLink[]>;
  writeLinks(list: QuickLink[]): Promise<QuickLink[]>;
  editLinks(): Promise<boolean>;
  readInstructions(): Promise<{ answers: Answers | null; body?: string; error?: string }>;
  writeInstructions(answers: Answers): Promise<Answers>;
  openInstructions(): Promise<boolean>;
  closeWindow(): void;
  onChanged(cb: () => void): () => void;
  onMenu(cb: (action: MenuAction) => void): () => void;
}

declare global {
  interface Window {
    vault?: VaultBridge;
  }
}

/**
 * The bridge is absent when the bundle is opened in a plain browser
 * (e.g. `expo start --web` without Electron). Fall back to a no-op shell so
 * the UI still renders instead of crashing on load.
 */
const missing: VaultBridge = {
  list: async () => [],
  read: async () => {
    throw new Error('bridge unavailable');
  },
  save: async () => {
    throw new Error('bridge unavailable');
  },
  remove: async () => false,
  reveal: async () => false,
  getDir: async () => '',
  listLinks: async () => [],
  writeLinks: async () => {
    throw new Error('bridge unavailable');
  },
  editLinks: async () => false,
  readInstructions: async () => ({ answers: null }),
  writeInstructions: async () => {
    throw new Error('bridge unavailable');
  },
  openInstructions: async () => false,
  closeWindow: () => {},
  onChanged: () => () => {},
  onMenu: () => () => {},
};

export const vault: VaultBridge =
  typeof window !== 'undefined' && window.vault ? window.vault : missing;

export const hasBridge = typeof window !== 'undefined' && !!window.vault;
