import { NavBar } from '../ui/NavBar';

/**
 * An honest placeholder. SPEC §11 says to ship after step 2 and let one real
 * prep session happen before anything else gets built, so these tabs exist in the
 * routing and say so rather than pretending.
 */
export function NotBuiltYet({
  title,
  step,
  what,
}: {
  title: string;
  step: string;
  what: string;
}) {
  return (
    <div className="screen">
      <NavBar title={title} />
      <div className="view">
        <div className="stub">
          <span className="step">{step}</span>
          <h2>Not built yet</h2>
          <p>{what}</p>
        </div>
      </div>
    </div>
  );
}
