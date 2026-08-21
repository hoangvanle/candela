import type { Tag } from '../db/types';

/** SPEC §8: the tag carries a token name, never a hex. */
export const tagClass = (tag: Tag): string => `t-${tag.color}`;

export function TagChip({ tag }: { tag: Tag }) {
  return <span className={`chip ${tagClass(tag)}`}>{tag.label}</span>;
}
