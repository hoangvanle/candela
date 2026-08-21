import { useMemo } from 'react';
import { countsByNote, loadNotes } from '../db/repo';
import type { Note } from '../db/types';
import { navigate } from '../router';
import { useLive } from '../store/useLive';
import { NavBar } from '../ui/NavBar';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function whenLabel(iso: string): string {
  const day = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return `${day.getDate()} ${MONTHS[day.getMonth()]}`;
}

/**
 * SPEC §6.2. Existing notes only — no creation UI here, that is the New note tab.
 */
export function Classes() {
  const notes = useLive(loadNotes, []);
  const counts = useLive(countsByNote, new Map());

  const groups = useMemo(() => {
    const out = new Map<string, Note[]>();
    for (const n of notes) {
      const key = `Level ${n.level} · Block ${n.block}`;
      const list = out.get(key);
      if (list) list.push(n);
      else out.set(key, [n]);
    }
    return [...out];
  }, [notes]);

  return (
    <div className="screen">
      <NavBar title="Classes" />
      <div className="view">
        <div className="pad">
          {groups.length ? (
            groups.map(([label, list]) => (
              <div key={label}>
                <div className="group">{label}</div>
                {list.map((n) => {
                  const c = counts.get(n.id) ?? { moves: 0, lines: 0, open: 0 };
                  return (
                    <button
                      key={n.id}
                      className="card classrow"
                      // SPEC §6.2 opens Review. Review is step 4; until it exists
                      // the note opens where it can still be read and added to.
                      onClick={() => navigate({ name: 'capture', noteId: n.id })}
                    >
                      <div className="row">
                        <div className="grow">
                          <div className="t">Class {n.classNo}</div>
                          <div className="tiny muted s">
                            {whenLabel(n.preppedOn)} with {n.preppedWith} · {c.moves}{' '}
                            {c.moves === 1 ? 'move' : 'moves'} · {c.lines}{' '}
                            {c.lines === 1 ? 'line' : 'lines'}
                          </div>
                        </div>
                        {c.open ? <span className="chip t-gold">{c.open} open</span> : null}
                        <span className="chev" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="empty">
              No classes yet.
              <br />
              <br />
              Start one from the New note tab.
            </div>
          )}
          <div className="tail" />
        </div>
      </div>
    </div>
  );
}
