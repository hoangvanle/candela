import { db, nowISO } from './db';
import type { Tag } from './types';

/**
 * Warm-up / Principle / Rutina are seed data, not an enum (SPEC §2.6, rule 7).
 * The user will invent more; these three are only today's three.
 * Tag colours per SPEC §8: warm-up = blue, principle = purple, rutina = gold,
 * user-created = teal.
 */
const SEED_TAGS: Omit<Tag, 'createdAt'>[] = [
  { id: 'warmup', label: 'Warm-up', color: 'blue' },
  { id: 'principle', label: 'Principle', color: 'purple' },
  { id: 'rutina', label: 'Rutina', color: 'gold' },
];

/**
 * Idempotent: only ever adds tags that are missing. Never overwrites a label.
 *
 * `createdAt` is staggered by one millisecond per seed, because it is also the
 * sort key (SPEC §5 gives Tag no sort field) and the prompt has to read
 * "Warm-up · Principle · Rutina" as specified — not whatever order IndexedDB
 * falls back to when three rows share a timestamp. Tags the user invents get a
 * real, later timestamp and so land after these three.
 */
export async function seedTags(): Promise<void> {
  const existing = new Set(await db.tags.toCollection().primaryKeys());
  const base = Date.parse(nowISO());
  const missing = SEED_TAGS.map((t, i) => ({
    ...t,
    createdAt: new Date(base + i).toISOString(),
  })).filter((t) => !existing.has(t.id));
  if (missing.length) await db.tags.bulkAdd(missing);
}
