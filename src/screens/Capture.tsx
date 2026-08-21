import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { movesOf } from '../db/group';
import { loadAllMoves, loadNote, loadNotes } from '../db/repo';
import type { Flag, ID, Item, Note } from '../db/types';
import { navigate } from '../router';
import { useItems } from '../store/useItems';
import { useTags } from '../store/useTags';
import { Back, Check } from '../ui/Icons';
import { NavBar } from '../ui/NavBar';
import { Sheet } from '../ui/Sheet';
import { tagClass } from '../ui/TagChip';
import { Composer, splitFlag, type LibraryHit } from './Composer';
import { Stream } from './Stream';

export const noteLabel = (n: Note): string => `L${n.level} · B${n.block} · C${n.classNo}`;

type LibEntry = { id: ID; name: string; where: string; at: string };

/**
 * SPEC §6.3, the most important screen in the app.
 *
 * Nothing here waits: a committed line is in memory and on screen before the
 * IndexedDB write is even scheduled (CLAUDE.md rule 3). The tab bar is hidden —
 * this is a full-screen editing context with the keyboard up.
 */
export function Capture({ noteId }: { noteId: ID }) {
  const [note, setNote] = useState<Note | null>(null);
  const [missing, setMissing] = useState(false);
  const { items, status, insert, patch, toggleTag } = useItems(noteId);
  const { tags, create: createTag } = useTags();

  const inputRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  const [currentMoveId, setCurrentMoveId] = useState<ID | null>(null);
  const [pending, setPending] = useState(true);
  const [armedFlag, setArmedFlag] = useState<Flag>('');
  const [tagPromptFor, setTagPromptFor] = useState<ID | null>(null);
  const [tagSheetFor, setTagSheetFor] = useState<ID | null>(null);
  const [switchBottom, setSwitchBottom] = useState<number | null>(null);
  const [hit, setHit] = useState<LibraryHit | null>(null);
  const [justAdded, setJustAdded] = useState<ID | null>(null);
  const [editingId, setEditingId] = useState<ID | null>(null);

  const moves = useMemo(() => movesOf(items), [items]);
  const currentMove = useMemo(
    () => items.find((i) => i.id === currentMoveId) ?? null,
    [items, currentMoveId],
  );

  useEffect(() => {
    let live = true;
    void loadNote(noteId).then((n) => {
      if (!live) return;
      if (n) setNote(n);
      else setMissing(true);
    });
    return () => {
      live = false;
    };
  }, [noteId]);

  /* Resume where she left off: the last move if the note has one, otherwise
     new-move mode so the very first thing typed names a move (SPEC §6.1). */
  const initialised = useRef<ID | null>(null);
  useEffect(() => {
    if (status !== 'ready' || initialised.current === noteId) return;
    initialised.current = noteId;
    const last = movesOf(items).at(-1);
    setCurrentMoveId(last?.id ?? null);
    setPending(!last);
  }, [noteId, status, items]);

  /* The move library: every move written down in another note. Loaded once —
     other notes do not change while this session is running. */
  const [library, setLibrary] = useState<Map<string, LibEntry>>(new Map());
  useEffect(() => {
    let live = true;
    void Promise.all([loadAllMoves(), loadNotes()]).then(([allMoves, notes]) => {
      if (!live) return;
      const noteById = new Map(notes.map((n) => [n.id, n]));
      const map = new Map<string, LibEntry>();
      for (const m of allMoves) {
        if (m.noteId === noteId) continue;
        const n = noteById.get(m.noteId);
        if (!n) continue;
        const key = m.text.trim().toLowerCase();
        const entry: LibEntry = {
          id: m.id,
          name: m.text.trim(),
          where: noteLabel(n),
          at: n.createdAt,
        };
        const prev = map.get(key);
        // Most recent class wins, so the suggestion points at the latest wording.
        if (!prev || prev.at < entry.at) map.set(key, entry);
      }
      setLibrary(map);
    });
    return () => {
      live = false;
    };
  }, [noteId]);

  /* Keep the composer focused. The field must never lose focus, so this only
     runs on mount — ordinary re-renders leave the uncontrolled input alone. */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* Show what was just typed. Not "scroll to the bottom": a line added to an
     earlier move lands mid-note, and that is what she needs to see. */
  useLayoutEffect(() => {
    if (!justAdded) return;
    viewRef.current
      ?.querySelector(`[data-id="${justAdded}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [justAdded]);

  /* The keyboard opening shrinks the scroll area, and the browser keeps the
     scroll offset — so whatever she was writing slides out of sight. Put the
     write position back in view whenever the viewport changes size. */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const repin = () =>
      requestAnimationFrame(() => {
        const el = viewRef.current;
        if (!el) return;
        const target = justAdded ? el.querySelector(`[data-id="${justAdded}"]`) : null;
        if (target) target.scrollIntoView({ block: 'nearest' });
        else el.scrollTop = el.scrollHeight;
      });
    vv.addEventListener('resize', repin);
    return () => vv.removeEventListener('resize', repin);
  }, [justAdded]);

  /* Opening an existing note lands at the end of it. */
  const scrolledOnLoad = useRef(false);
  useLayoutEffect(() => {
    if (status !== 'ready' || scrolledOnLoad.current || !items.length) return;
    scrolledOnLoad.current = true;
    const el = viewRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [status, items.length]);

  const refocus = useCallback(() => inputRef.current?.focus(), []);

  const onType = useCallback(
    (value: string) => {
      // The library suggestion only makes sense while naming a move.
      if (!pending) {
        setHit((prev) => (prev ? null : prev));
        return;
      }
      const v = value.trim().toLowerCase();
      if (v.length < 3) {
        setHit((prev) => (prev ? null : prev));
        return;
      }
      let found: LibEntry | null = null;
      for (const [key, entry] of library) {
        if (key.startsWith(v) && key !== v) {
          found = entry;
          break;
        }
      }
      setHit((prev) =>
        prev?.name === found?.name ? prev : found ? { name: found.name, where: found.where } : null,
      );
    },
    [pending, library],
  );

  const startedMove = useCallback((move: Item) => {
    setCurrentMoveId(move.id);
    setPending(false);
    // SPEC §6.3: the tag prompt appears the moment the move is created.
    setTagPromptFor(move.id);
    setJustAdded(move.id);
  }, []);

  const commit = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const { text, flag } = splitFlag(input.value, armedFlag);
    if (!text) return;

    if (pending) {
      // A move title carries no flag.
      const move = insert('move', text, '', currentMoveId);
      if (move) startedMove(move);
    } else {
      const line = insert('line', text, flag, currentMoveId);
      if (line) {
        setTagPromptFor(null);
        setJustAdded(line.id);
      }
    }

    input.value = '';
    setArmedFlag('');
    setHit(null);
  }, [armedFlag, pending, currentMoveId, insert, startedMove]);

  const useLibraryMove = useCallback(
    (name: string) => {
      const entry = library.get(name.trim().toLowerCase());
      const move = insert('move', entry?.name ?? name, '', currentMoveId, {
        libraryMoveId: entry?.id ?? null,
      });
      if (move) startedMove(move);
      if (inputRef.current) inputRef.current.value = '';
      setHit(null);
      refocus();
    },
    [library, currentMoveId, insert, startedMove, refocus],
  );

  const armFlag = useCallback((f: Flag) => {
    setArmedFlag((prev) => (prev === f ? '' : f));
  }, []);

  const writeInto = useCallback(
    (id: ID | null) => {
      setCurrentMoveId(id);
      setPending(false);
      setTagPromptFor(null);
      setSwitchBottom(null);
      refocus();
    },
    [refocus],
  );

  const startEdit = useCallback((id: ID) => {
    setEditingId(id);
    setTagPromptFor(null);
  }, []);

  const saveEdit = useCallback(
    (id: ID, text: string, flag: Flag) => {
      patch(id, { text, flag });
      setEditingId(null);
      refocus();
    },
    [patch, refocus],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    refocus();
  }, [refocus]);

  const openTagSheet = useCallback((moveId: ID) => setTagSheetFor(moveId), []);

  const closeTagSheet = useCallback(() => {
    setTagSheetFor(null);
    refocus();
  }, [refocus]);

  if (missing) {
    return (
      <div className="screen">
        <NavBar
          title="Not found"
          left={
            <button className="iconbtn" onClick={() => navigate({ name: 'classes' })} aria-label="Back">
              <Back />
            </button>
          }
        />
        <div className="view">
          <div className="empty">That note is gone.</div>
        </div>
      </div>
    );
  }

  const sheetMove = tagSheetFor ? items.find((i) => i.id === tagSheetFor) : null;

  return (
    <div className="screen">
      <NavBar
        title={note ? noteLabel(note) : ' '}
        sub={
          note ? `prep with ${note.preppedWith} · ${items.length} ${items.length === 1 ? 'line' : 'lines'}` : undefined
        }
        left={
          <button className="iconbtn" onClick={() => navigate({ name: 'classes' })} aria-label="Back">
            <Back />
          </button>
        }
        right={
          // SPEC §6.3 sends Done to Review. Review is step 4 — until then the
          // Classes list is where reading happens.
          <button className="txtbtn" onClick={() => navigate({ name: 'classes' })}>
            Done
          </button>
        }
      />

      <div className="view" ref={viewRef}>
        <Stream
          items={items}
          tags={tags}
          currentMoveId={currentMoveId}
          tagPromptFor={tagPromptFor}
          editingId={editingId}
          onToggleTag={toggleTag}
          onOpenTagSheet={openTagSheet}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
        />
      </div>

      <Composer
        inputRef={inputRef}
        disabled={editingId !== null}
        pending={pending}
        currentMove={currentMove}
        armedFlag={armedFlag}
        hit={hit}
        onCommit={commit}
        onTogglePending={() => setPending((p) => !p)}
        onArmFlag={armFlag}
        onOpenSwitch={setSwitchBottom}
        onUseLibrary={useLibraryMove}
        onType={onType}
      />

      {switchBottom !== null ? (
        <>
          <div
            className="menuscrim"
            onClick={() => {
              setSwitchBottom(null);
              refocus();
            }}
          />
          <div className="cmenu" style={{ left: 12, bottom: switchBottom }} role="menu">
            <div className="hd">Write into</div>
            {moves.map((m) => (
              <button
                key={m.id}
                role="menuitem"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => writeInto(m.id)}
              >
                <span className="tick">{m.id === currentMoveId ? <Check /> : null}</span>
                <span className="grow">{m.text}</span>
              </button>
            ))}
            <button
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => writeInto(null)}
            >
              <span className="tick">{currentMoveId === null ? <Check /> : null}</span>
              <span className="grow">End of the note</span>
            </button>
          </div>
        </>
      ) : null}

      {sheetMove ? (
        <Sheet
          title={sheetMove.text}
          onClose={closeTagSheet}
          action={
            <button className="txtbtn" onClick={closeTagSheet}>
              Done
            </button>
          }
        >
          <div className="tagpick">
            {tags.map((t) => {
              const on = sheetMove.tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  className={on ? tagClass(t) : 'off'}
                  onClick={() => toggleTag(sheetMove.id, t.id)}
                  aria-pressed={on}
                >
                  {on ? '✓ ' : ''}
                  {t.label}
                </button>
              );
            })}
          </div>
          <NewTagField
            onAdd={(label) => {
              const tag = createTag(label);
              if (tag && !sheetMove.tags.includes(tag.id)) toggleTag(sheetMove.id, tag.id);
            }}
          />
        </Sheet>
      ) : null}
    </div>
  );
}

/** A new tag can be created during capture and is usable immediately (SPEC §10.10). */
function NewTagField({ onAdd }: { onAdd: (label: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);

  const add = () => {
    const el = ref.current;
    if (!el || !el.value.trim()) return;
    onAdd(el.value);
    el.value = '';
  };

  return (
    <div className="newtag">
      <div className="box">
        <input
          ref={ref}
          placeholder="New tag…"
          autoComplete="off"
          aria-label="New tag"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
      </div>
      <button className="btn sm" style={{ width: 'auto', padding: '0 18px' }} onClick={add}>
        Add
      </button>
    </div>
  );
}
