import { RiderLoader } from '@/components/loading/RiderLoader';

/**
 * A whole screen waiting on something.
 *
 * Used where there is nothing to show yet and no shell to show it in: a session
 * being restored, a route whose guard has not decided, a screen checking
 * whether a ride is already running.
 *
 * It draws the same bike as the opening screen, which is what makes the join
 * invisible when the opening lifts straight into one of these — the cover goes
 * and the scene underneath is the one that was already there. Without that,
 * a cold start showed a splash, then a different spinner: two loaders in a row,
 * which reads as two separate waits.
 *
 * `label` is worth passing whenever the caller knows what is being waited for.
 * "Restoring your session" tells someone why they are waiting; a bare
 * "Loading" tells them only that they are.
 */
export function FullPageLoader({ label = 'Getting things ready…' }) {
  return (
    <div
      className="grid min-h-dvh place-items-center bg-app px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <RiderLoader label={label} />
    </div>
  );
}
