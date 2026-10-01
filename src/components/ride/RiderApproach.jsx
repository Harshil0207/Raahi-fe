import { LocateFixed, Loader2, Navigation } from 'lucide-react';
import { RIDE_STATUS } from '@/constants/ride';
import { cn } from '@/lib/utils';

/**
 * How far away the rider is, and how long they are likely to be.
 *
 * Every figure on this card comes from the server. The distance is the one the
 * nearby and arrival notifications were decided from, so the card and the
 * notification can never disagree — a screen that computed its own would
 * eventually say "80 m" beside a notification that had not fired.
 *
 * NOTHING HERE INVENTS A NUMBER. When the routing provider is unreachable the
 * backend returns a null duration rather than a fabricated one, and this shows
 * "Calculating ETA…". A confident "0 min" is worse than an honest absence: the
 * customer stops watching the road and starts watching the door.
 */

/** Metres, as a person would say them. */
function readableDistance(metres) {
  if (metres == null) return null;
  if (metres < 950) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

const HEADLINE = {
  [RIDE_STATUS.ACCEPTED]: 'Your rider is on the way',
  [RIDE_STATUS.ARRIVING]: 'Your rider is on the way',
  [RIDE_STATUS.ARRIVED]: 'Your rider has arrived',
  [RIDE_STATUS.OTP_VERIFIED]: 'On the way to your destination',
  [RIDE_STATUS.IN_PROGRESS]: 'On the way to your destination'
};

export function RiderApproach({ status, distanceMeters, eta, stale, nearby, onCentre, className }) {
  const headline = HEADLINE[status];
  if (!headline) return null;

  const distance = readableDistance(distanceMeters);
  const arrived = status === RIDE_STATUS.ARRIVED;

  /**
   * "Nearby" is about the approach to the pickup, and nothing else.
   *
   * The flag is a latch on the ride — once the rider crossed the line it stays
   * set for the rest of the trip — so reading it at any later stage puts "your
   * rider is nearby" above a card that says the drop-off is six kilometres
   * away. It only means anything while they are still coming to collect.
   */
  const approaching = status === RIDE_STATUS.ACCEPTED || status === RIDE_STATUS.ARRIVING;

  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border border-hair bg-surface p-3', className)}>
      <span
        aria-hidden
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full',
          arrived ? 'bg-[var(--success-wash)] text-[var(--success)]' : 'bg-[var(--accent-wash)] text-accent'
        )}
      >
        <Navigation className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-body">
          {nearby && approaching ? 'Your rider is nearby' : headline}
        </p>

        {/**
         * The live line, announced politely so somebody not watching the screen
         * still hears the rider getting closer — but only this line, not the
         * whole card, or every re-render would be read out again.
         */}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted" aria-live="polite">
          {arrived ? (
            // A distance and an ETA are noise once they are standing outside.
            // What the customer needs now is to go out and find them.
            <span>Please meet your rider</span>
          ) : stale ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {/* Not "rider offline". A phone in a tunnel has not abandoned the trip. */}
              Updating rider location…
            </span>
          ) : (
            <>
              {distance && <span className="tabular">{distance} away</span>}

              {eta?.durationMin != null ? (
                <span className="tabular">
                  {distance ? '· ' : ''}
                  {eta.durationMin} min
                </span>
              ) : (
                !arrived && <span>{distance ? '· ' : ''}Calculating ETA…</span>
              )}

              {!distance && !arrived && !eta?.durationMin && <span>Following your rider…</span>}
            </>
          )}
        </p>
      </div>

      {onCentre && (
        <button
          type="button"
          onClick={onCentre}
          aria-label="Centre the map on your rider"
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full border border-hair bg-elevated',
            'text-body transition-transform active:scale-95 hover:bg-sunken'
          )}
        >
          <LocateFixed className="size-[18px]" aria-hidden />
        </button>
      )}
    </div>
  );
}
