import { useCallback, useEffect, useState } from 'react';

export const BUILD_ID = __BUILD_ID__;

/**
 * `registerType: 'autoUpdate'` installs a new service worker and lets it take
 * over, but it never reloads the page — so the tab keeps running the old bundle.
 * On an installed iOS PWA that is invisible: relaunching from the home screen
 * usually *resumes* the app rather than reloading it, so a new version can sit
 * there indefinitely and the only way out looks like delete-and-reinstall.
 *
 * So: check for a new worker at start and whenever the app comes back to the
 * foreground, and report when the running page has gone stale. Reloading is left
 * to the caller — never automatic, because a reload during capture would throw
 * away the half-typed line in the composer (CLAUDE.md rule 3).
 */
export function useAppUpdate() {
  const [stale, setStale] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    // A first-ever visit goes from uncontrolled to controlled, which is not an
    // update. Only a controller changing under a page that already had one is.
    const hadController = !!sw.controller;
    const onChange = () => {
      if (hadController) setStale(true);
    };
    sw.addEventListener('controllerchange', onChange);
    return () => sw.removeEventListener('controllerchange', onChange);
  }, []);

  const check = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;
    setChecking(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    } catch (e) {
      // Offline, or the host is unreachable. Nothing to do and nothing to say.
      console.error('[candela] update check failed', e);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [check]);

  /** Check first, so the tap picks up a version that has only just landed. */
  const reload = useCallback(async () => {
    await check();
    window.location.reload();
  }, [check]);

  return { buildId: BUILD_ID, stale, checking, check, reload };
}
