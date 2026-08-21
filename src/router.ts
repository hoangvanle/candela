import { useEffect, useState } from 'react';

/**
 * Hash routing, hand-rolled. An installed PWA has no browser chrome, so the only
 * thing routing has to do is give the nav-bar back button a real history entry.
 * Not worth a dependency.
 *
 *   #/new  #/classes  #/moves  #/ask  #/note/:id  #/note/:id/review
 */
export type Route =
  | { name: 'new' }
  | { name: 'classes' }
  | { name: 'moves' }
  | { name: 'ask' }
  | { name: 'capture'; noteId: string }
  | { name: 'review'; noteId: string };

export const HOME: Route = { name: 'new' };

export function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [head, id, tail] = path;
  switch (head) {
    case 'classes':
      return { name: 'classes' };
    case 'moves':
      return { name: 'moves' };
    case 'ask':
      return { name: 'ask' };
    case 'note':
      if (!id) return HOME;
      return tail === 'review' ? { name: 'review', noteId: id } : { name: 'capture', noteId: id };
    default:
      return HOME;
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'capture':
      return `#/note/${route.noteId}`;
    case 'review':
      return `#/note/${route.noteId}/review`;
    default:
      return `#/${route.name}`;
  }
}

export const navigate = (route: Route): void => {
  window.location.hash = href(route);
};

/** Replaces the current entry — for redirects that should not be "back"-able. */
export const redirect = (route: Route): void => {
  window.location.replace(href(route));
};

export const back = (): void => window.history.back();

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const read = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', read);
    if (!window.location.hash) redirect(HOME);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return route;
}
