import { db } from '../db/db';
import { isOpenQuestion } from '../db/group';
import { href, type Route } from '../router';
import { useLive } from '../store/useLive';
import { TabAsk, TabClasses, TabMoves, TabNew } from './Icons';

/**
 * SPEC §6: four tabs, in this order. Visible on all four roots and on Review,
 * hidden on Capture — that is a full-screen editing context with the keyboard up.
 */
const TABS = [
  { name: 'new' as const, label: 'New note', Icon: TabNew, accent: true },
  { name: 'classes' as const, label: 'Classes', Icon: TabClasses, accent: false },
  { name: 'moves' as const, label: 'Moves', Icon: TabMoves, accent: false },
  { name: 'ask' as const, label: 'Ask Ido', Icon: TabAsk, accent: false },
];

const countOpenQuestions = async (): Promise<number> => {
  let n = 0;
  await db.items.each((i) => {
    if (isOpenQuestion(i)) n++;
  });
  return n;
};

export function TabBar({ route }: { route: Route }) {
  // SPEC §6.6: the tab bar carries a badge with the open count.
  const open = useLive(countOpenQuestions, 0);

  return (
    <nav className="tabbar">
      {TABS.map(({ name, label, Icon, accent }) => (
        <a
          key={name}
          href={href({ name })}
          className={[route.name === name ? 'on' : '', accent ? 'accent' : '']
            .filter(Boolean)
            .join(' ')}
          aria-current={route.name === name ? 'page' : undefined}
        >
          <Icon />
          {name === 'ask' && open > 0 ? (
            <span className="badge" aria-label={`${open} open questions`}>
              {open}
            </span>
          ) : null}
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
