/** SPEC §5. The whole data model. */

export type ID = string; // uuid v4, generated client-side

export type Note = {
  id: ID;
  level: number; // 1..6
  block: number; // 1..n
  classNo: number; // 1..6
  preppedOn: string; // ISO date
  preppedWith: string; // 'Ido' for now; a userId once accounts exist
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // soft delete, for sync
};

export type ItemKind = 'move' | 'line';

/** '' none · '!' important · '?' question for Ido */
export type Flag = '' | '!' | '?';

export type Item = {
  id: ID;
  noteId: ID;
  kind: ItemKind;
  text: string;
  flag: Flag;
  answer: string; // filled when a '?' is resolved; empty = still open
  tags: ID[]; // tag ids; only meaningful on kind === 'move'
  libraryMoveId: ID | null; // set when linked to a known move
  sort: string; // fractional index — never an array position
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Tag = {
  id: ID; // slug
  label: string;
  color: string; // token name, not a hex
  createdAt: string;
};

/**
 * Sync is SPEC §11 step 6. The table exists from version 1 so turning sync on
 * later is a config change and not a migration. Nothing writes to it yet.
 */
export type OutboxEntry = {
  seq?: number;
  entity: 'note' | 'item' | 'tag';
  entityId: ID;
  queuedAt: string;
};
