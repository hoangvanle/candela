/**
 * The only place that talks to Dexie. Reads are awaited; writes are fired and
 * forgotten by the caller so the capture path never waits (SPEC §4,
 * CLAUDE.md rule 3). `persist` reports failures instead of swallowing them —
 * "nothing is ever lost" is the one promise this app has to keep.
 */
import { db, newId, nowISO } from './db';
import { isOpenQuestion } from './group';
import { bySort } from './order';
import type { Flag, ID, Item, ItemKind, Note, Tag } from './types';

let onPersistError: ((e: unknown) => void) | null = null;

/** Called with the first write failure. The UI turns it into a visible warning. */
export function setPersistErrorHandler(fn: (e: unknown) => void): void {
  onPersistError = fn;
}

function persist(work: () => Promise<unknown>): void {
  void work().catch((e) => {
    console.error('[candela] write to IndexedDB failed', e);
    onPersistError?.(e);
  });
}

/* ---------------- notes ---------------- */

export function makeNote(level: number, block: number, classNo: number): Note {
  const at = nowISO();
  return {
    id: newId(),
    level,
    block,
    classNo,
    preppedOn: at.slice(0, 10),
    preppedWith: 'Ido',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
}

export const putNote = (note: Note): void => persist(() => db.notes.put(note));

export const loadNote = (id: ID): Promise<Note | undefined> => db.notes.get(id);

export async function loadNotes(): Promise<Note[]> {
  const rows = await db.notes.toArray();
  return rows
    .filter((n) => !n.deletedAt)
    .sort(
      (a, b) =>
        a.level - b.level ||
        a.block - b.block ||
        a.classNo - b.classNo ||
        a.createdAt.localeCompare(b.createdAt),
    );
}

/* ---------------- items ---------------- */

export function makeItem(
  noteId: ID,
  kind: ItemKind,
  text: string,
  flag: Flag,
  sort: string,
): Item {
  const at = nowISO();
  return {
    id: newId(),
    noteId,
    kind,
    text,
    flag,
    answer: '',
    tags: [],
    libraryMoveId: null,
    sort,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
}

export const putItem = (item: Item): void => persist(() => db.items.put(item));

export async function loadItems(noteId: ID): Promise<Item[]> {
  const rows = await db.items.where('noteId').equals(noteId).toArray();
  return rows.filter((i) => !i.deletedAt).sort(bySort);
}

/** Every move ever written down, newest note last. Feeds the capture suggestion. */
export async function loadAllMoves(): Promise<Item[]> {
  const rows = await db.items.toArray();
  return rows.filter((i) => i.kind === 'move' && !i.deletedAt).sort(bySort);
}

/** Line counts for the Classes list, without loading every line into memory. */
export async function countsByNote(): Promise<Map<ID, { moves: number; lines: number; open: number }>> {
  const out = new Map<ID, { moves: number; lines: number; open: number }>();
  await db.items.each((i) => {
    if (i.deletedAt) return;
    const c = out.get(i.noteId) ?? { moves: 0, lines: 0, open: 0 };
    if (i.kind === 'move') c.moves++;
    c.lines++;
    if (isOpenQuestion(i)) c.open++;
    out.set(i.noteId, c);
  });
  return out;
}

/* ---------------- tags ---------------- */

export const loadTags = (): Promise<Tag[]> => db.tags.orderBy('createdAt').toArray();

export const putTag = (tag: Tag): void => persist(() => db.tags.put(tag));

export function makeTag(label: string): Tag {
  return {
    id: label.trim().toLowerCase().replace(/\s+/g, '-'),
    label: label.trim(),
    // Every tag the user invents is teal (SPEC §8).
    color: 'teal',
    createdAt: nowISO(),
  };
}
