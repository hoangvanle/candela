import { liveQuery } from 'dexie';
import { useEffect, useRef, useState } from 'react';

/**
 * Subscribe to a Dexie query and re-run it whenever the tables it touched
 * change. For reads that are allowed to be async — lists, counts, badges.
 *
 * Never use this on the capture path: it puts an IndexedDB round trip between a
 * keystroke and the line appearing (CLAUDE.md rule 3). See `useItems` instead.
 *
 * `query` must take no arguments and close over nothing that changes; it is
 * captured once so Dexie can keep tracking the same subscription.
 */
export function useLive<T>(query: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  const ref = useRef(query);
  ref.current = query;

  useEffect(() => {
    const sub = liveQuery(() => ref.current()).subscribe({
      next: setValue,
      error: (e) => console.error('[candela] liveQuery failed', e),
    });
    return () => sub.unsubscribe();
  }, []);

  return value;
}
