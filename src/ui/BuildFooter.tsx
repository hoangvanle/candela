type Props = {
  buildId: string;
  checking: boolean;
  onReload: () => void;
};

/**
 * Test-build affordance. An installed iOS PWA has no address bar, no reload
 * button and no pull-to-refresh, so without this the only apparent way to pick up
 * a new version is to delete the app and add it to the home screen again.
 *
 * Lives on the New note tab, which has the room and is one tap from anywhere.
 * Deliberately not on Capture — nothing goes near that screen.
 *
 * To remove for release: drop this file, the `.buildfoot` block in base.css, and
 * the one usage in NewNote.
 */
export function BuildFooter({ buildId, checking, onReload }: Props) {
  return (
    <div className="buildfoot">
      <div className="id">
        <b>Build</b>
        {buildId}
      </div>
      <button onClick={onReload} disabled={checking}>
        {checking ? 'Checking…' : 'Reload'}
      </button>
    </div>
  );
}
