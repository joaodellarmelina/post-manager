import { useCallback, useEffect, useRef, useState } from 'react';
import { vault, type Post, type PostDraft } from '../api';

/**
 * Owns the post list. The folder is the source of truth, so every mutation
 * ends in a reload and external edits arrive through `onChanged`.
 */
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const next = await vault.list();
      if (!mounted.current) return;
      setPosts(next);
      setError(null);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    reload();
    const off = vault.onChanged(reload);
    return () => {
      mounted.current = false;
      off();
    };
  }, [reload]);

  const save = useCallback(
    async (filename: string | null, draft: PostDraft): Promise<Post> => {
      const saved = await vault.save(filename, draft);
      await reload();
      return saved;
    },
    [reload],
  );

  const remove = useCallback(
    async (filename: string) => {
      await vault.remove(filename);
      await reload();
    },
    [reload],
  );

  return { posts, loading, error, reload, save, remove };
}
