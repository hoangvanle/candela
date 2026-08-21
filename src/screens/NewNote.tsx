import { useMemo, useState } from 'react';
import { countsByNote, loadNotes, makeNote, putNote } from '../db/repo';
import type { Note } from '../db/types';
import { navigate } from '../router';
import { useLive } from '../store/useLive';
import { BuildFooter } from '../ui/BuildFooter';
import { NavBar } from '../ui/NavBar';
import { noteLabel } from './Capture';

const MAX_LEVEL = 6;
const MAX_CLASS = 6;

type Numbers = { level: number; block: number; classNo: number };

export type UpdateControls = { buildId: string; checking: boolean; reload: () => void };

/** The next class in the most recently used block (SPEC §6.1). */
function nextInBlock(notes: Note[]): Numbers {
  const latest = notes.reduce<Note | null>(
    (best, n) => (!best || n.createdAt > best.createdAt ? n : best),
    null,
  );
  if (!latest) return { level: 1, block: 1, classNo: 1 };
  return {
    level: latest.level,
    block: latest.block,
    classNo: Math.min(MAX_CLASS, latest.classNo + 1),
  };
}

const isToday = (iso: string) => iso.slice(0, 10) === new Date().toISOString().slice(0, 10);

/**
 * SPEC §6.1. Creating a note is a destination, not a button buried in a list.
 * Target: two taps from opening the app to a live keyboard — so the numbers are
 * already right and the only tap that matters is "Start typing".
 */
export function NewNote({ update }: { update: UpdateControls }) {
  const notes = useLive(loadNotes, []);
  const counts = useLive(countsByNote, new Map());
  const [override, setOverride] = useState<Numbers | null>(null);

  const derived = useMemo(() => nextInBlock(notes), [notes]);
  const value = override ?? derived;

  // Something started today and not finished — the way back in after a force-quit.
  const unfinished = useMemo(
    () =>
      notes
        .filter((n) => isToday(n.createdAt))
        .reduce<Note | null>((best, n) => (!best || n.createdAt > best.createdAt ? n : best), null),
    [notes],
  );

  const bump = (key: keyof Numbers, delta: number) => {
    const max = key === 'level' ? MAX_LEVEL : key === 'classNo' ? MAX_CLASS : Infinity;
    setOverride({ ...value, [key]: Math.min(max, Math.max(1, value[key] + delta)) });
  };

  const start = () => {
    const note = makeNote(value.level, value.block, value.classNo);
    putNote(note);
    navigate({ name: 'capture', noteId: note.id });
  };

  return (
    <div className="screen">
      <NavBar title="New note" />
      <div className="view">
        <div className="hero">
          <div className="k">Next in the block</div>
          <h2>
            L{value.level} · B{value.block} · C{value.classNo}
          </h2>
          <p>No title, no folder. The class is its number.</p>
        </div>

        <div className="pad">
          <div className="steppers">
            <Stepper label="Level" value={value.level} max={MAX_LEVEL} onBump={(d) => bump('level', d)} />
            <Stepper label="Block" value={value.block} onBump={(d) => bump('block', d)} />
            <Stepper
              label="Class"
              value={value.classNo}
              max={MAX_CLASS}
              onBump={(d) => bump('classNo', d)}
            />
          </div>

          <button className="btn" style={{ marginTop: 12 }} onClick={start}>
            Start typing
          </button>

          {unfinished ? (
            <>
              <div className="h-sec">Still open</div>
              <button
                className="card continue"
                onClick={() => navigate({ name: 'capture', noteId: unfinished.id })}
              >
                <div className="row">
                  <div className="grow">
                    <div className="t">Continue {noteLabel(unfinished)}</div>
                    <div className="tiny s">
                      {counts.get(unfinished.id)?.lines ?? 0} lines · still writing
                    </div>
                  </div>
                  <span className="chev" style={{ borderColor: 'var(--ember)' }} />
                </div>
              </button>
            </>
          ) : null}

          <BuildFooter
            buildId={update.buildId}
            checking={update.checking}
            onReload={update.reload}
          />
          <div className="tail" />
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  max = Infinity,
  onBump,
}: {
  label: string;
  value: number;
  max?: number;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="stepper">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      <div className="pm">
        <button onClick={() => onBump(-1)} disabled={value <= 1} aria-label={`${label} down`}>
          −
        </button>
        <button onClick={() => onBump(1)} disabled={value >= max} aria-label={`${label} up`}>
          +
        </button>
      </div>
    </div>
  );
}
