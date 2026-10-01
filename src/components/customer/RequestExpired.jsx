import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, RefreshCw, Repeat, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { ServiceIcon } from '@/components/common/ServiceIcon';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import * as rideApi from '@/services/ride.api';
import { formatDistance, formatMoney } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * Nobody took the ride.
 *
 * This state existed before this sheet did — the ride sat in SEARCHING with
 * every offer expired — and the customer was shown a search animation
 * indefinitely with a toast they had probably already dismissed. It is a dead
 * end that looked like progress, which is the worst kind.
 *
 * So it says what happened, shows the trip it happened to, and offers the three
 * things a person actually wants: ask again, ask for something else, or give
 * up. The fare on the button is the current one, because a rate may have moved
 * since the ride was created and nobody should press "ask again — ₹80" and be
 * charged ₹95.
 */
export function RequestExpired({ ride, onRequested, onCancel }) {
  const reduced = usePrefersReducedMotion();

  const [choosing, setChoosing] = useState(false);
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(ride.serviceType);
  const [working, setWorking] = useState(false);
  // Written synchronously, so a second tap in the same task is turned away
  // before React has had a chance to re-render the button as disabled.
  const inFlight = useRef(false);

  const exhausted = (ride.reRequestsLeft ?? 0) <= 0;

  // Loaded when the customer asks to change, not before: most of them will just
  // press the first button, and a request nobody needed is a request not worth
  // making.
  useEffect(() => {
    if (!choosing || options) return;

    let alive = true;
    rideApi
      .getChangeOptions(ride._id)
      .then((result) => alive && setOptions(result))
      .catch((err) => alive && toast.error(err.message));

    return () => {
      alive = false;
    };
  }, [choosing, options, ride._id]);

  const chosen = options?.services?.find((s) => s.serviceType === selected);

  // Before the options have loaded, the ride's own estimate is the honest
  // figure to show — it is what the customer was last quoted.
  const fare = chosen ? chosen.estimatedFare : ride.estimatedFare;
  const currency = chosen?.currency || ride.currency;
  const free = chosen?.free || fare === 0;

  async function ask() {
    /**
     * One request per tap, however fast the taps arrive.
     *
     * A ref rather than the `working` state, and this is not a stylistic
     * choice. `setWorking(true)` does not change `working` until React
     * re-renders, and `disabled` does not reach the DOM until then either — so
     * three clicks dispatched in one task all see `working === false` on a
     * button the browser still considers enabled, and all three fire. Measured:
     * three taps, three rides requested.
     *
     * A ref is written synchronously, so the second tap in the same task sees
     * it. The state still exists, for the label and the disabled attribute;
     * this is what actually enforces the rule.
     */
    if (inFlight.current) return;
    inFlight.current = true;

    setWorking(true);
    try {
      const result = await rideApi.requestAgain(
        ride._id,
        selected !== ride.serviceType ? selected : null
      );

      if (result.dispatch?.requested > 0) {
        toast.success(`Asking ${result.dispatch.requested} rider${result.dispatch.requested > 1 ? 's' : ''}`);
      } else {
        toast.warning('No riders are nearby right now. You can try again in a moment.');
      }

      onRequested?.(result);
    } catch (err) {
      toast.error(err.message);
    } finally {
      inFlight.current = false;
      setWorking(false);
    }
  }

  return (
    <motion.section
      aria-label="Request expired"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <header className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[var(--warning-wash)]">
          <RefreshCw className="size-[18px] text-[var(--warning)]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight text-body">Request expired</h2>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">
            No rider accepted your request.
          </p>
        </div>
      </header>

      {/* The trip it happened to, so the customer is not asked to confirm
          something they have to scroll away to identify. */}
      <dl className="space-y-2.5 rounded-2xl bg-sunken p-3.5">
        <Leg label="Pickup" value={ride.pickup?.address} />
        <Leg label="Destination" value={ride.destination?.address} />

        <div className="flex items-center justify-between gap-3 border-t border-hair pt-2.5">
          <dt className="flex items-center gap-2 text-[12.5px] text-muted">
            <ServiceIcon serviceType={selected} className="size-4" />
            {chosen?.label || ride.serviceType}
          </dt>
          <dd className="tabular text-[12.5px] text-muted">{formatDistance(ride.estimatedDistanceKm)}</dd>
        </div>
      </dl>

      <AnimatePresence initial={false}>
        {choosing && (
          <motion.div
            key="options"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {!options ? (
              <p className="flex items-center gap-2 px-1 py-3 text-[13px] text-muted">
                <Spinner className="size-4" /> Pricing the alternatives…
              </p>
            ) : (
              <div className="space-y-1.5" role="radiogroup" aria-label="Choose a different vehicle">
                {options.services.map((service) => (
                  <button
                    key={service.serviceType}
                    type="button"
                    role="radio"
                    aria-checked={selected === service.serviceType}
                    disabled={working}
                    onClick={() => setSelected(service.serviceType)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left',
                      'transition-colors duration-150',
                      selected === service.serviceType
                        ? 'border-[var(--accent)] bg-[var(--accent-wash)]'
                        : 'border-hair hover:bg-[var(--surface-sunken)]'
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-xl',
                        selected === service.serviceType
                          ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                          : 'bg-sunken text-body'
                      )}
                    >
                      <ServiceIcon serviceType={service.serviceType} className="size-[17px]" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14.5px] font-semibold text-body">{service.label}</span>
                        {selected === service.serviceType && (
                          <Check className="size-3.5 shrink-0 text-accent" aria-hidden />
                        )}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {formatMoney(service.ratePerKm, service.currency)}/km
                      </span>
                    </span>

                    <span className="tabular shrink-0 text-[14.5px] font-semibold text-body">
                      {service.free || service.estimatedFare === 0
                        ? 'Free'
                        : formatMoney(service.estimatedFare, service.currency)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {exhausted ? (
          <p className="rounded-2xl bg-sunken px-3.5 py-3 text-[13px] leading-snug text-muted">
            You have asked as many times as the platform allows for this ride. Book a new one to keep
            looking.
          </p>
        ) : (
          // The label changes while the request is in flight, so the state is
          // readable rather than only inferable from a spinner.
          <Button size="lg" block loading={working} onClick={ask}>
            {working ? (
              'Requesting…'
            ) : (
              <>
                <Repeat aria-hidden />
                {free ? 'Request again — Free' : `Request again — ${formatMoney(fare, currency)}`}
              </>
            )}
          </Button>
        )}

        {!exhausted && (
          <Button size="lg" block variant="outline" disabled={working} onClick={() => setChoosing((v) => !v)}>
            {choosing ? 'Keep this vehicle' : 'Change ride'}
          </Button>
        )}

        <Button size="lg" block variant="ghost" disabled={working} onClick={onCancel}>
          <X aria-hidden />
          Cancel this ride
        </Button>
      </div>

      {!exhausted && ride.reRequestsLeft != null && (
        <p className="text-center text-[11.5px] text-faint">
          {ride.reRequestsLeft} more {ride.reRequestsLeft === 1 ? 'try' : 'tries'} for this ride
        </p>
      )}
    </motion.section>
  );
}

function Leg({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[12px] text-faint">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-right text-[13px] text-body">{value || '—'}</dd>
    </div>
  );
}
