export type Status = 'draft' | 'ready' | 'published';
export type PostType = 'feed' | 'reels' | 'carousel' | 'stories';

export interface Post {
  filename: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: Status;
  type: PostType;
  tags: string[];
  /** Reference links; a post can carry any number of them. */
  links: string[];
  body: string;
  error: string | null;
}

export type PostDraft = Omit<Post, 'filename' | 'error'>;

type MenuAction =
  | 'new' | 'save' | 'close-panel' | 'today' | 'delete'
  | 'search' | 'prev-month' | 'next-month' | 'toggle-sidebar' | 'shortcuts';

interface VaultBridge {
  list(): Promise<Post[]>;
  read(filename: string): Promise<Post>;
  save(filename: string | null, data: PostDraft): Promise<Post>;
  remove(filename: string): Promise<boolean>;
  reveal(filename?: string): Promise<boolean>;
  getDir(): Promise<string>;
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
  closeWindow: () => {},
  onChanged: () => () => {},
  onMenu: () => () => {},
};

export const vault: VaultBridge =
  typeof window !== 'undefined' && window.vault ? window.vault : missing;

export const hasBridge = typeof window !== 'undefined' && !!window.vault;
