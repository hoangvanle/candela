import { memo } from 'react';
import { looseOf } from '../db/group';
import type { ID, Item, Tag } from '../db/types';
import { Doc } from '../ui/Icons';
import { tagClass, TagChip } from '../ui/TagChip';

type Props = {
  items: Item[];
  tags: Tag[];
  /** The move being written into. Its left rule is solid ember (SPEC §6.3). */
  currentMoveId: ID | null;
  /** The move whose "Tag it?" prompt is showing, if any. */
  tagPromptFor: ID | null;
  onToggleTag: (moveId: ID, tagId: ID) => void;
  onOpenTagSheet: (moveId: ID) => void;
};

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
  onToggleTag,
  onOpenTagSheet,
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
      {items.map((it) =>
        it.kind === 'move' ? (
          <div key={it.id} data-id={it.id}>
            <MoveRow
              move={it}
              current={it.id === currentMoveId}
              tags={it.tags.map((id) => byId.get(id)).filter((t): t is Tag => !!t)}
            />
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
            <LineRow line={it} loose={looseIds.has(it.id)} />
            {it.answer ? (
              <div className="answer">
                <b>Ido:</b> {it.answer}
              </div>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
});

function MoveRow({
  move,
  current,
  tags,
}: {
  move: Item;
  current: boolean;
  tags: Tag[];
}) {
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
  // Tapping must not pull focus out of the composer, or iOS drops the keyboard.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
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
