import { memo, useEffect, useRef, useState } from 'react';
import { looseOf } from '../db/group';
import type { Flag, ID, Item, Tag } from '../db/types';
import { Check, Doc } from '../ui/Icons';
import { tagClass, TagChip } from '../ui/TagChip';

type Props = {
  items: Item[];
  tags: Tag[];
  /** The move being written into. Its left rule is solid ember (SPEC §6.3). */
  currentMoveId: ID | null;
  /** The move whose "Tag it?" prompt is showing, if any. */
  tagPromptFor: ID | null;
  /** The row that has turned into a field. */
  editingId: ID | null;
  onToggleTag: (moveId: ID, tagId: ID) => void;
  onOpenTagSheet: (moveId: ID) => void;
  onStartEdit: (id: ID) => void;
  onSaveEdit: (id: ID, text: string, flag: Flag) => void;
  onCancelEdit: () => void;
};

// Tapping must not pull focus out of the composer, or iOS drops the keyboard.
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

/**
 * The stream. Move titles are headings with a left rule; lines are indented
 * beneath. Important lines are ember, questions gold, answers a teal block under
 * their question (SPEC §6.3).
 *
 * Memoised: typing in the composer must not re-render every row.
 */
export const Stream = memo(function Stream({
  items,
  tags,
  currentMoveId,
  tagPromptFor,
  editingId,
  onToggleTag,
  onOpenTagSheet,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  if (!items.length) {
    return (
      <div className="empty">
        Ido starts talking.
        <br />
        <br />
        Type the name of the first move and press return.
      </div>
    );
  }

  const looseIds = new Set(looseOf(items).map((i) => i.id));
  const byId = new Map(tags.map((t) => [t.id, t]));

  return (
    <div className="stream">
      {items.map((it) => {
        if (editingId === it.id) {
          return (
            <div key={it.id} data-id={it.id}>
              <EditRow item={it} onSave={onSaveEdit} onCancel={onCancelEdit} />
            </div>
          );
        }
        return it.kind === 'move' ? (
          <div key={it.id} data-id={it.id}>
            <button
              className="itemrow"
              onMouseDown={keepFocus}
              onClick={() => onStartEdit(it.id)}
              aria-label={`Edit move ${it.text}`}
            >
              <MoveRow
                move={it}
                current={it.id === currentMoveId}
                tags={it.tags.map((id) => byId.get(id)).filter((t): t is Tag => !!t)}
              />
            </button>
            {tagPromptFor === it.id ? (
              <TagPrompt
                move={it}
                tags={tags}
                onToggle={onToggleTag}
                onMore={() => onOpenTagSheet(it.id)}
              />
            ) : null}
            {it.libraryMoveId ? (
              <div className="libnote">
                <Doc /> written down before
              </div>
            ) : null}
          </div>
        ) : (
          <div key={it.id} data-id={it.id}>
            <button
              className="itemrow"
              onMouseDown={keepFocus}
              onClick={() => onStartEdit(it.id)}
              aria-label={`Edit line ${it.text}`}
            >
              <LineRow line={it} loose={looseIds.has(it.id)} />
            </button>
            {it.answer ? (
              <div className="answer">
                <b>Ido:</b> {it.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});

function MoveRow({ move, current, tags }: { move: Item; current: boolean; tags: Tag[] }) {
  const showChips = tags.length > 0 || current;
  return (
    <div className={`moverow${current ? '' : ' idle'}`}>
      <div className="grow">
        <div className="n">{move.text}</div>
        {showChips ? (
          <div className="chips" style={{ marginTop: 5 }}>
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
            {current ? <span className="chip here">writing here</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LineRow({ line, loose }: { line: Item; loose: boolean }) {
  const kind = line.flag === '!' ? ' imp' : line.flag === '?' ? ' q' : '';
  return (
    <div className={`linerow${kind}${loose ? ' loose' : ''}`}>
      {line.flag ? (
        // The glyph always accompanies the colour — never colour alone (SPEC §9).
        <span className="fm" aria-label={line.flag === '!' ? 'important' : 'question for Ido'}>
          {line.flag}
        </span>
      ) : (
        <span className="b" />
      )}
      <span className="grow">{line.text}</span>
    </div>
  );
}

/**
 * SPEC §7: tapping a row turns it into a field, in place. Return or the confirm
 * saves, Escape cancels. The flag lives in local state until then, so cancelling
 * really does undo everything the edit touched.
 */
function EditRow({
  item,
  onSave,
  onCancel,
}: {
  item: Item;
  onSave: (id: ID, text: string, flag: Flag) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [flag, setFlag] = useState<Flag>(item.flag);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const save = () => {
    const text = ref.current?.value.trim() ?? '';
    // An empty row would be worse than the typo. Nothing is destroyed here.
    if (!text) return onCancel();
    onSave(item.id, text, flag);
  };

  return (
    <div className="edrow">
      <div className="box">
        <input
          ref={ref}
          defaultValue={item.text}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          aria-label={item.kind === 'move' ? 'Move name' : 'Line'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <div className="tools">
          {/* A move title carries no flag, so it gets no flag toggles. */}
          {item.kind === 'line' ? (
            <>
              <button
                className={flag === '!' ? 'on' : ''}
                onMouseDown={keepFocus}
                onClick={() => setFlag((f) => (f === '!' ? '' : '!'))}
                aria-pressed={flag === '!'}
              >
                <b style={{ color: flag === '!' ? '#fff' : 'var(--ember)' }}>!</b> important
              </button>
              <button
                className={`flag-q${flag === '?' ? ' on' : ''}`}
                onMouseDown={keepFocus}
                onClick={() => setFlag((f) => (f === '?' ? '' : '?'))}
                aria-pressed={flag === '?'}
              >
                <b style={{ color: flag === '?' ? '#fff' : 'var(--gold)' }}>?</b> ask Ido
              </button>
            </>
          ) : null}
          <span className="sp" />
          <button onMouseDown={keepFocus} onClick={onCancel}>
            Cancel
          </button>
          <button className="done" onMouseDown={keepFocus} onClick={save} aria-label="Save">
            <Check />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SPEC §6.3: appears directly under a move the moment it is created, and
 * disappears when the next line is typed. The list comes from the tags table —
 * Warm-up / Principle / Rutina are seed data, never an enum (rule 7).
 */
function TagPrompt({
  move,
  tags,
  onToggle,
  onMore,
}: {
  move: Item;
  tags: Tag[];
  onToggle: (moveId: ID, tagId: ID) => void;
  onMore: () => void;
}) {
  return (
    <div className="tagprompt">
      <span className="lbl">Tag it?</span>
      {tags.map((t) => {
        const on = move.tags.includes(t.id);
        return (
          <button
            key={t.id}
            className={on ? `on ${tagClass(t)}` : ''}
            onMouseDown={keepFocus}
            onClick={() => onToggle(move.id, t.id)}
            aria-pressed={on}
          >
            {on ? '✓ ' : ''}
            {t.label}
          </button>
        );
      })}
      <button onMouseDown={keepFocus} onClick={onMore} aria-label="More tags">
        +
      </button>
    </div>
  );
}
