import { useCallback, useEffect, useRef, useState } from 'react';
import { nowISO } from '../db/db';
import { bySort } from '../db/order';
import { loadItems, makeItem, putItem } from '../db/repo';
import { sortForInsert } from '../db/group';
import type { Flag, ID, Item, ItemKind } from '../db/types';

type Status = 'loading' | 'ready';

/**
 * The open note's items.
 *
 * `ref.current` is the synchronous source of truth — a write lands there before
 * the function returns, so nothing in the capture path ever waits (SPEC §4).
 * `setItems` only drives the render, and `putItem` mirrors to IndexedDB in the
 * background. Deliberately not `liveQuery`: that would put an async IndexedDB
 * round trip between a keystroke and the line appearing.
 */
export function useItems(noteId: ID | null) {
  const ref = useRef<Item[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  const write = useCallback((next: Item[]) => {
    ref.current = next;
    setItems(next);
  }, []);

  useEffect(() => {
    if (!noteId) {
      write([]);
      setStatus('ready');
      return;
    }
    let live = true;
    setStatus('loading');
    void loadItems(noteId).then((rows) => {
      if (!live) return;
      write(rows);
      setStatus('ready');
    });
    return () => {
      live = false;
    };
  }, [noteId, write]);

  /** Insert a new item relative to the move currently being written into. */
  const insert = useCallback(
    (
      kind: ItemKind,
      text: string,
      flag: Flag,
      currentMoveId: ID | null,
      extra?: Partial<Pick<Item, 'libraryMoveId' | 'tags'>>,
    ): Item | null => {
      if (!noteId) return null;
      const sort = sortForInsert(ref.current, currentMoveId);
      const item = { ...makeItem(noteId, kind, text, flag, sort), ...extra };
      write([...ref.current, item].sort(bySort));
      putItem(item);
      return item;
    },
    [noteId, write],
  );

  const patch = useCallback(
    (id: ID, changes: Partial<Omit<Item, 'id' | 'noteId'>>): void => {
      const at = ref.current.findIndex((i) => i.id === id);
      if (at < 0) return;
      const next = { ...ref.current[at]!, ...changes, updatedAt: nowISO() };
      const all = ref.current.slice();
      all[at] = next;
      write(all.sort(bySort));
      putItem(next);
    },
    [write],
  );

  /** Add or remove one tag on a move. */
  const toggleTag = useCallback(
    (moveId: ID, tagId: ID): void => {
      const move = ref.current.find((i) => i.id === moveId);
      if (!move) return;
      const tags = move.tags.includes(tagId)
        ? move.tags.filter((t) => t !== tagId)
        : [...move.tags, tagId];
      patch(moveId, { tags });
    },
    [patch],
  );

  return { items, status, insert, patch, toggleTag };
}
