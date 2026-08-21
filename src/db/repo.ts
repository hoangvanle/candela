/**
 * The only place that talks to Dexie. Reads are awaited; writes are fired and
 * forgotten by the caller so the capture path never waits (SPEC §4,
 * CLAUDE.md rule 3). Failures are reported rather than swallowed — "nothing is
 * ever lost" is the one promise this app has to keep.
 *
 * That promise has a gap a fire-and-forget write cannot close on its own: an
 * IndexedDB transaction takes a few milliseconds to commit, and if the document
 * is torn down inside that window the row is gone. Rare on a fast phone, but
 * SPEC §10.3 says force-quitting loses nothing already committed with Return, and
 * CI on a slow runner lost the last line of a note every time.
 *
 * So every write is held in `inFlight` until Dexie confirms it, and on teardown
 * whatever is still in flight is dumped to localStorage — which is synchronous,
 * so there is no window — and replayed before the next read. Costs nothing while
 * typing: the stash only happens if something is genuinely unconfirmed.
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

type Table = 'notes' | 'items' | 'tags';
type Pending = { table: Table; row: Note | Item | Tag };

const RESCUE_KEY = 'candela.rescue';
const inFlight = new Map<string, Pending>();

/* Dexie's tables are typed individually, so the dispatch is spelled out rather
   than indexed. Boring beats clever in the layer that must not lose a line. */
function putRow(pending: Pending): Promise<unknown> {
  switch (pending.table) {
    case 'notes':
      return db.notes.put(pending.row as Note);
    case 'items':
      return db.items.put(pending.row as Item);
    case 'tags':
      return db.tags.put(pending.row as Tag);
  }
}

async function bulkPutRows(table: Table, rows: (Note | Item | Tag)[]): Promise<void> {
  switch (table) {
    case 'notes':
      await db.notes.bulkPut(rows as Note[]);
      return;
    case 'items':
      await db.items.bulkPut(rows as Item[]);
      return;
    case 'tags':
      await db.tags.bulkPut(rows as Tag[]);
      return;
  }
}

function put(table: Table, row: Note | Item | Tag): void {
  const key = `${table}:${row.id}`;
  const pending: Pending = { table, row };
  inFlight.set(key, pending);
  void putRow(pending)
    .then(() => {
      inFlight.delete(key);
    })
    .catch((e: unknown) => {
      // Left in flight on purpose, so the stash can still rescue it.
      console.error('[candela] write to IndexedDB failed', e);
      onPersistError?.(e);
    });
}

/**
 * Call on teardown. Synchronous, so it completes before the document goes.
 */
export function stashInFlight(): void {
  if (!inFlight.size) return;
  try {
    localStorage.setItem(RESCUE_KEY, JSON.stringify([...inFlight.values()]));
  } catch (e) {
    console.error('[candela] could not stash unconfirmed writes', e);
  }
}

async function recoverInFlight(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RESCUE_KEY);
  } catch {
    return; // Private browsing, or storage is off. Nothing to recover from.
  }
  if (!raw) return;
  try {
    const pending = JSON.parse(raw) as Pending[];
    for (const table of ['notes', 'items', 'tags'] as const) {
      const rows = pending.filter((p) => p.table === table).map((p) => p.row);
      if (rows.length) await bulkPutRows(table, rows);
    }
  } catch (e) {
    console.error('[candela] could not replay unconfirmed writes', e);
  }
  try {
    localStorage.removeItem(RESCUE_KEY);
  } catch {
    /* nothing useful to do */
  }
}

let recovery: Promise<void> | null = null;

/** Every read goes through this, so a replay always lands before the first read. */
function recovered(): Promise<void> {
  recovery ??= recoverInFlight();
  return recovery;
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

export const putNote = (note: Note): void => put('notes', note);

export const loadNote = async (id: ID): Promise<Note | undefined> => {
  await recovered();
  return db.notes.get(id);
};

export async function loadNotes(): Promise<Note[]> {
  await recovered();
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

export const putItem = (item: Item): void => put('items', item);

export async function loadItems(noteId: ID): Promise<Item[]> {
  await recovered();
  const rows = await db.items.where('noteId').equals(noteId).toArray();
  return rows.filter((i) => !i.deletedAt).sort(bySort);
}

/** Every move ever written down, newest note last. Feeds the capture suggestion. */
export async function loadAllMoves(): Promise<Item[]> {
  await recovered();
  const rows = await db.items.toArray();
  return rows.filter((i) => i.kind === 'move' && !i.deletedAt).sort(bySort);
}

/** Line counts for the Classes list, without loading every line into memory. */
export async function countsByNote(): Promise<Map<ID, { moves: number; lines: number; open: number }>> {
  await recovered();
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

export const loadTags = async (): Promise<Tag[]> => {
  await recovered();
  return db.tags.orderBy('createdAt').toArray();
};

export const putTag = (tag: Tag): void => put('tags', tag);

export function makeTag(label: string): Tag {
  return {
    id: label.trim().toLowerCase().replace(/\s+/g, '-'),
    label: label.trim(),
    // Every tag the user invents is teal (SPEC §8).
    color: 'teal',
    createdAt: nowISO(),
  };
}
