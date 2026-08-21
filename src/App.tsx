import { useEffect, useState } from 'react';
import { setPersistErrorHandler } from './db/repo';
import { useRoute } from './router';
import { useAppUpdate } from './store/useAppUpdate';
import { Capture } from './screens/Capture';
import { Classes } from './screens/Classes';
import { NewNote } from './screens/NewNote';
import { NotBuiltYet } from './screens/NotBuiltYet';
import { TabBar } from './ui/TabBar';

/**
 * The iOS keyboard shrinks the visual viewport without shrinking the layout
 * viewport, so a full-height flex column would put the composer underneath it.
 * Tracking visualViewport keeps the composer sitting on top of the keyboard.
 */
function useViewportHeight(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    const apply = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${h}px`);
      // env(safe-area-inset-bottom) describes the *layout* viewport, so iOS keeps
      // reporting 34px behind the keyboard. Knowing the keyboard is up lets the
      // CSS give that strip back — it is a quarter of the visible stream.
      const keyboardUp = window.innerHeight - h > 120;
      document.documentElement.dataset.keyboard = keyboardUp ? 'up' : 'down';
    };
    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, []);
}

export default function App() {
  const route = useRoute();
  useViewportHeight();
  const { buildId, stale, checking, reload } = useAppUpdate();

  // "Nothing is ever lost" is the one promise this app has to keep. If a write
  // to IndexedDB fails, she finds out while she can still do something about it.
  const [persistFailed, setPersistFailed] = useState(false);
  useEffect(() => setPersistErrorHandler(() => setPersistFailed(true)), []);

  // SPEC §6: the tab bar is hidden on Capture — a full-screen editing context.
  const showTabs = route.name !== 'capture';
  // Never offer a reload mid-capture; it would take the half-typed line with it.
  const offerUpdate = stale && route.name !== 'capture';

  return (
    <>
      {persistFailed ? (
        <div className="persist-warning" role="alert">
          This phone would not save the last change. Screenshot anything you cannot lose, then
          restart the app.
        </div>
      ) : null}

      {offerUpdate ? (
        <div className="update-bar" role="status">
          <span className="grow">A newer version is ready.</span>
          <button onClick={reload}>Reload</button>
        </div>
      ) : null}

      {route.name === 'new' ? <NewNote update={{ buildId, checking, reload }} /> : null}
      {route.name === 'classes' ? <Classes /> : null}
      {route.name === 'capture' ? <Capture noteId={route.noteId} /> : null}
      {route.name === 'review' ? (
        <NotBuiltYet
          title="Review"
          step="Build order · step 4"
          what="The Before-you-teach brief, one look / every detail, and the raw capture. Until it exists, a note opens in Capture — the stream is already readable there."
        />
      ) : null}
      {route.name === 'moves' ? (
        <NotBuiltYet
          title="Moves"
          step="Build order · step 5"
          what="Every move you have written down, deduped across classes, searchable and filterable by tag. Tags applied during capture are already being stored for it."
        />
      ) : null}
      {route.name === 'ask' ? (
        <NotBuiltYet
          title="Ask Ido"
          step="Build order · step 5"
          what="Every open question across every class, in one list, answerable. Anything flagged with ? during capture is already waiting here."
        />
      ) : null}

      {showTabs ? <TabBar route={route} /> : null}
    </>
  );
}
