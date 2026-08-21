import Dexie, { type Table } from 'dexie';
import type { Item, Note, OutboxEntry, Tag } from './types';

/**
 * IndexedDB is the source of truth (SPEC §4). The studio has no signal, so the
 * UI never waits on the network — and never waits on this either: every write
 * is applied to in-memory state first and mirrored here optimistically.
 */
export class CandelaDB extends Dexie {
  notes!: Table<Note, string>;
  items!: Table<Item, string>;
  tags!: Table<Tag, string>;
  outbox!: Table<OutboxEntry, number>;

  constructor(name = 'candela') {
    super(name);
    this.version(1).stores({
      notes: 'id, [level+block], updatedAt, deletedAt',
      items: 'id, noteId, [noteId+sort], updatedAt, deletedAt',
      tags: 'id, createdAt',
      outbox: '++seq, entity',
    });
  }
}

export const db = new CandelaDB();

export const nowISO = (): string => new Date().toISOString();

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : // Safari below 15.4. Good enough for a client-side id.
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
