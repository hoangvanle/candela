/**
 * SPEC §5 "Ordering". Items are ordered by a fractional index string, never by
 * array position. Reordering writes one row, and two devices reordering
 * concurrently converge instead of clobbering each other. This matters even
 * though v1 is single-user — an array index would make sync unimplementable.
 */
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/** A key that sorts strictly between `before` and `after`. null = open end. */
export function sortBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

/** `count` keys that sort strictly between `before` and `after`. */
export function sortsBetween(
  before: string | null,
  after: string | null,
  count: number,
): string[] {
  return generateNKeysBetween(before, after, count);
}

/** Comparator for anything carrying a fractional index. */
export function bySort(a: { sort: string }, b: { sort: string }): number {
  return a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0;
}
