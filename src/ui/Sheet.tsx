import { useEffect, type ReactNode } from 'react';
import { Close } from './Icons';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional trailing action in the sheet header. */
  action?: ReactNode;
};

/**
 * A bottom sheet, permitted only for things that are not spatial operations —
 * picking tags, answering a question. Reordering, editing and deleting happen on
 * the row itself (CLAUDE.md rule 4).
 */
export function Sheet({ title, onClose, children, action }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="sh">
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            <Close />
          </button>
          <h2>{title}</h2>
          {action ?? <div className="navspacer" />}
        </div>
        <div className="sb">{children}</div>
      </div>
    </>
  );
}
