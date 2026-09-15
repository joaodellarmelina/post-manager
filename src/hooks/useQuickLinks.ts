import { useCallback, useEffect, useRef, useState } from 'react';
import { vault, type QuickLink } from '../api';

/**
 * Toolbar quick links from `links.md`. The vault watcher fires for any file
 * in the folder, so editing the list in another app updates the toolbar.
 */
export function useQuickLinks() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const next = await vault.listLinks();
      if (mounted.current) setLinks(next);
    } catch {
      // An unreadable links file is not worth a banner; the toolbar just goes quiet.
      if (mounted.current) setLinks([]);
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

  return { links };
}
