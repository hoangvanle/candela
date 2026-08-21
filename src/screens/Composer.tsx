import { useCallback, useRef, useState, type RefObject } from 'react';
import type { Flag, Item } from '../db/types';
import { ChevronDown, Mic, Plus, Send } from '../ui/Icons';

export type LibraryHit = { name: string; where: string };

type Props = {
  inputRef: RefObject<HTMLInputElement>;
  /** Dimmed and inert while a row is being edited in place (SPEC §7). */
  disabled: boolean;
  /** New-move mode: the token turns ember and reads NEW MOVE (SPEC §6.3). */
  pending: boolean;
  /** The move being written into, or null for the end of the note. */
  currentMove: Item | null;
  /** Flag armed by the ! / ? buttons, applied to the next committed line. */
  armedFlag: Flag;
  /** A move already written down that the typed name prefixes. */
  hit: LibraryHit | null;
  onCommit: () => void;
  onTogglePending: () => void;
  onArmFlag: (flag: Flag) => void;
  onOpenSwitch: (bottom: number) => void;
  onUseLibrary: (name: string) => void;
  /** Called on every keystroke so the parent can recompute `hit`. */
  onType: (value: string) => void;
};

/**
 * SPEC §6.3. Two zones: a field row with a token chip for the current move, and
 * an iOS-style accessory bar. Every button here prevents its own default
 * mousedown so focus never leaves the input — on iOS a focus change drops the
 * keyboard, and the field must never lose focus.
 */
export function Composer({
  inputRef,
  disabled,
  pending,
  currentMove,
  armedFlag,
  hit,
  onCommit,
  onTogglePending,
  onArmFlag,
  onOpenSwitch,
  onUseLibrary,
  onType,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  // A leading ! or ? in the field arms the same flag, so show it as armed.
  const [typedFlag, setTypedFlag] = useState<Flag | null>(null);
  const flag = typedFlag ?? armedFlag;

  const keepFocus = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  const handleInput = useCallback(() => {
    const value = inputRef.current?.value ?? '';
    const lead: Flag | null = value.startsWith('!') ? '!' : value.startsWith('?') ? '?' : null;
    // Same value bails out of the render, so ordinary typing costs nothing.
    setTypedFlag(lead);
    onType(value);
  }, [inputRef, onType]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      onCommit();
      setTypedFlag(null);
    },
    [onCommit],
  );

  const commitFromButton = useCallback(() => {
    onCommit();
    setTypedFlag(null);
  }, [onCommit]);

  const openSwitch = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    // The menu is fixed-position; anchor it to the top of the composer.
    onOpenSwitch(window.innerHeight - bar.getBoundingClientRect().top + 8);
  }, [onOpenSwitch]);

  return (
    // `.off` dims it and takes it out of the pointer path. Not aria-hidden: the
    // subtree is still tabbable, and hiding a tabbable subtree is worse than
    // leaving it announced. Revisited with the rest of SPEC §7.
    <div className={`composer${disabled ? ' off' : ''}`} ref={barRef}>
      {hit ? (
        <div className="sugg">
          <div className="grow">
            <b>{hit.name}</b> — written down before, in {hit.where}
          </div>
          <button onMouseDown={keepFocus} onClick={() => onUseLibrary(hit.name)}>
            Use
          </button>
        </div>
      ) : null}

      <div className="inrow">
        <div className={`field${pending ? ' move' : ''}`}>
          {pending ? (
            <span className="token on">
              <span className="t">NEW MOVE</span>
            </span>
          ) : (
            <button
              className="token"
              onMouseDown={keepFocus}
              onClick={openSwitch}
              aria-label="Write into"
            >
              <span className="t">{currentMove ? currentMove.text : 'End of note'}</span>
              <ChevronDown />
            </button>
          )}
          <input
            ref={inputRef}
            // Uncontrolled on purpose: React must never re-mount or re-value this
            // element, or the caret and the keyboard go with it.
            defaultValue=""
            placeholder={pending ? 'Move name…' : 'What Ido says…'}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            enterKeyHint="enter"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label={pending ? 'Move name' : 'What Ido says'}
          />
        </div>
        <button
          className="send"
          onMouseDown={keepFocus}
          onClick={commitFromButton}
          aria-label="Add line"
        >
          <Send />
        </button>
      </div>

      <div className="acc">
        <button
          className={`p${pending ? ' on' : ''}`}
          onMouseDown={keepFocus}
          onClick={onTogglePending}
          aria-pressed={pending}
        >
          <Plus /> New move
        </button>
        <span className="sep" />
        <button
          className={`i flag-imp${flag === '!' ? ' on' : ''}`}
          onMouseDown={keepFocus}
          onClick={() => onArmFlag('!')}
          aria-pressed={flag === '!'}
          aria-label="Mark the next line important"
        >
          !
        </button>
        <button
          className={`i flag-q${flag === '?' ? ' on' : ''}`}
          onMouseDown={keepFocus}
          onClick={() => onArmFlag('?')}
          aria-pressed={flag === '?'}
          aria-label="Make the next line a question for Ido"
        >
          ?
        </button>
        <span className="sep" />
        {/* Voice capture is explicitly not in v1 (SPEC §3). Visible and inert. */}
        <span className="i inert" aria-hidden>
          <Mic />
        </span>
        <span className="grow" />
      </div>
      <div className="safe" />
    </div>
  );
}

/** Strips a leading flag character off a typed line (SPEC §6.3 typing rules). */
export function splitFlag(raw: string, armed: Flag): { text: string; flag: Flag } {
  const trimmed = raw.trim();
  const lead = trimmed.charAt(0);
  if (lead === '!' || lead === '?') {
    return { text: trimmed.slice(1).trim(), flag: lead };
  }
  return { text: trimmed, flag: armed };
}
