/**
 * SPEC §5 "Grouping". There is no parent pointer. A `line` belongs to the
 * nearest preceding `move` in sort order; lines before the first move are loose
 * notes. This is deliberate — promoting a line to a move, or deleting a move
 * title, never requires rewriting children.
 *
 * Every function here takes an array already in sort order and already filtered
 * of soft-deleted rows. See `liveItems` in the store.
 */
import { sortBetween } from './order';
import type { ID, Item } from './types';

export const movesOf = (items: Item[]): Item[] => items.filter((i) => i.kind === 'move');

/** The lines under `moveId`, up to the next move. */
export function detailsOf(items: Item[], moveId: ID): Item[] {
  const at = items.findIndex((i) => i.id === moveId);
  if (at < 0) return [];
  const out: Item[] = [];
  for (let j = at + 1; j < items.length; j++) {
    const it = items[j]!;
    if (it.kind === 'move') break;
    out.push(it);
  }
  return out;
}

/** The lines typed before any move existed. */
export function looseOf(items: Item[]): Item[] {
  const out: Item[] = [];
  for (const it of items) {
    if (it.kind === 'move') break;
    out.push(it);
  }
  return out;
}

/**
 * A '?' nobody has answered yet. The single definition — the Ask Ido badge, the
 * per-class count and the Review brief all have to agree on what "open" means.
 */
export const isOpenQuestion = (item: Item): boolean =>
  !item.deletedAt && item.flag === '?' && !item.answer;

/**
 * Where a newly typed item lands (SPEC §6.3, last typing rule): after the last
 * line of the current move, *not* at the end of the note — so jumping back to
 * an earlier move and adding to it works.
 *
 * A new move title uses the same boundary, matching the prototype: writing
 * continues from wherever you are rather than jumping to the end.
 */
export function sortForInsert(items: Item[], currentMoveId: ID | null): string {
  if (!currentMoveId) {
    // "End of the note".
    return sortBetween(items.at(-1)?.sort ?? null, null);
  }
  const at = items.findIndex((i) => i.id === currentMoveId);
  if (at < 0) return sortBetween(items.at(-1)?.sort ?? null, null);

  let boundary = at + 1;
  while (boundary < items.length && items[boundary]!.kind !== 'move') boundary++;

  return sortBetween(items[boundary - 1]!.sort, items[boundary]?.sort ?? null);
}
