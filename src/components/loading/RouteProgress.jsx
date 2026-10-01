import { useEffect, useState, useSyncExternalStore } from 'react';
import { isPending, subscribeToPending } from '@/routes/pending';
import { RiderLoader } from './RiderLoader';

/**
 * The loading animation, for the wait nobody could see before.
 *
 * Moving to a screen for the first time downloads its code, and the router
 * keeps the previous page on screen while that happens — so on anything slower
 * than a local build, a tap appeared to do nothing at all. This is what fills
 * that gap.
 *
 * It waits before appearing. Most navigations resolve in a few dozen
 * milliseconds, and an indicator that flashes up and vanishes on every tap
 * reads as a glitch rather than as progress; below the threshold the
 * navigation simply happens. The number is a judgement about perception, not
 * about the network: under about a fifth of a second a change feels immediate,
 * and interrupting that with a loader makes the app feel slower than saying
 * nothing.
 */
const APPEAR_AFTER_MS = 180;

export function RouteProgress() {
  const pending = useSyncExternalStore(subscribeToPending, isPending, () => false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return undefined;
    }

    const id = setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    return () => clearTimeout(id);
  }, [pending]);

  if (!visible) return null;

  return (
    <div
      // Over the page but under the app bar and the sheets, so the screen
      // being left is dimmed rather than replaced — the navigation is still
      // reversible, and hiding where you came from makes that feel final.
      className="pointer-events-none fixed inset-0 z-30 grid place-items-center bg-[color-mix(in_oklab,var(--background)_78%,transparent)] backdrop-blur-[2px]"
    >
      <RiderLoader size="sm" label="Loading" entrance={false} />
    </div>
  );
}
