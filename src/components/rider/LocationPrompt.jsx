import { useState } from 'react';
import { MapPinOff, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The way out of "I cannot go online and nothing is telling me why".
 *
 * A rider without a position cannot go on the road, so this is not a detail
 * tucked into a panel — it sits with the GO button, where the block is felt.
 * It used to live inside the status card's expandable half, which is collapsed
 * by default and `inert` while collapsed: the button existed, was measured in
 * tests, and could not be seen or reached. Worse, it was rendered only when the
 * permission had NOT been denied — so the one rider who most needed a way
 * forward, the one who had tapped "Block", was given a sentence and no button.
 *
 * Three different problems wear the same symptom, and each needs a different
 * sentence:
 *
 *   never asked  — the browser will prompt, so offer the prompt.
 *   denied       — script cannot re-prompt; only site settings can undo it,
 *                  so say where that is instead of offering a dead button.
 *   insecure     — the browser will never ask on this origin. Nothing the
 *                  rider does in the app can fix it, so say what will.
 */
export function LocationPrompt({
  /**
   * What the location is needed FOR, which changes the wording entirely.
   *
   * 'online' is the rider standing still, unable to start work. 'ride' is the
   * rider already carrying a job whose customer is watching a marker that has
   * stopped moving — telling that person they need location "to go online" is
   * nonsense, because they already are.
   */
  reason = 'online',
  isDenied,
  isInsecure,
  canPrompt,
  isLocating,
  error,
  onRequest,
  className
}) {
  const [showHow, setShowHow] = useState(false);

  const insecure = Boolean(isInsecure);
  const blocked = Boolean(isDenied) && !insecure;

  const onRide = reason === 'ride';

  const title = insecure
    ? 'Location needs a secure connection'
    : blocked
      ? 'Location is blocked for this site'
      : onRide
        ? 'Location permission is required to track your ride'
        : 'Share your location to go online';

  const body = insecure
    ? error ||
      'Browsers only share location over a secure connection. Open the app on localhost or over https.'
    : blocked
      ? onRide
        ? 'Your customer is watching for you and cannot see you move. Allow location for this site to start sending it again.'
        : 'Ride requests are matched to where you are, so this is needed before you can go online.'
      : onRide
        ? 'Your customer follows your position on their map until you reach them.'
        : 'Requests are matched to where you are. Your location is only sent while you are online.';

  return (
    <section
      aria-label="Location needed"
      className={cn(
        'w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-elevated)]',
        'px-3.5 py-3 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--warning-wash)]"
        >
          {insecure ? (
            <ShieldAlert className="size-4 text-[var(--warning)]" />
          ) : (
            <MapPinOff className="size-4 text-[var(--warning)]" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-[13.5px] font-semibold leading-tight text-body">{title}</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{body}</p>

          {/**
           * One control, and it always does something.
           *
           * When the browser can still be asked, it asks. When it cannot, it
           * reveals where to change it — which is the only honest action left,
           * and is better than a button that silently fails.
           */}
          {canPrompt ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2.5 h-11 w-full"
              loading={isLocating}
              onClick={onRequest}
            >
              {isLocating ? 'Finding you…' : 'Enable location'}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="mt-2.5 h-11 w-full"
                aria-expanded={showHow}
                onClick={() => setShowHow((v) => !v)}
              >
                {showHow ? 'Hide steps' : 'How to fix this'}
              </Button>

              {showHow && (
                <div className="mt-2.5 rounded-2xl bg-sunken p-3">
                  {insecure ? (
                    /**
                     * Two audiences, one situation.
                     *
                     * In production the reader is a rider on a misconfigured
                     * deployment, and the only useful sentence is "this needs
                     * https". In development the reader is whoever is testing
                     * on a phone over `http://192.168.x.x`, for whom "use
                     * https" is true but unhelpful — so the dev build names the
                     * two routes that actually work on a LAN. `import.meta.env.DEV`
                     * is compiled out of a production build, so none of this
                     * ships.
                     */
                    <ol className="ml-4 list-decimal space-y-1 text-[12px] leading-snug text-muted">
                      {import.meta.env.DEV ? (
                        <>
                          <li>
                            On the phone, open Chrome and go to{' '}
                            <code className="rounded bg-app px-1">chrome://flags</code>, find
                            “Insecure origins treated as secure”, add{' '}
                            <code className="rounded bg-app px-1">{window.location.origin}</code>,
                            enable it and relaunch Chrome.
                          </li>
                          <li>
                            Or plug the phone in by USB and use Chrome’s port forwarding from{' '}
                            <code className="rounded bg-app px-1">chrome://inspect</code>, then open
                            the app at localhost on the phone — localhost counts as secure.
                          </li>
                          <li>Or serve the app over https, which is what production does.</li>
                        </>
                      ) : (
                        <>
                          <li>The app has to be served over https for a browser to share location.</li>
                          <li>On a development machine, opening it at localhost also works.</li>
                        </>
                      )}
                    </ol>
                  ) : (
                    <ol className="ml-4 list-decimal space-y-1 text-[12px] leading-snug text-muted">
                      <li>Tap the icon at the left of the address bar.</li>
                      <li>Find Location in the site permissions.</li>
                      <li>Set it to Allow, then reload this page.</li>
                    </ol>
                  )}
                </div>
              )}
            </>
          )}

          {/**
           * The browser's own words, but only when they add something.
           *
           * For a denial and for an insecure origin the heading and body above
           * already say it, and repeating the raw message underneath made the
           * same sentence appear twice in one card. What is worth surfacing is
           * the case neither branch covers: a timeout, or a position the device
           * could not fix.
           */}
          {error && !insecure && !blocked && (
            <p className="mt-2 text-[11.5px] leading-snug text-faint">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
