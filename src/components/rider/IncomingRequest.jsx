import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { BottomSheet, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ServiceIcon } from '@/components/common/ServiceIcon';
import { CountdownRing } from './CountdownRing';
import { RoutePreview } from '@/components/ride/RoutePreview';
import { useCountdown } from '@/hooks/useCountdown';
import { BOOKING_TYPE, SERVICE_LABEL, bookingTypeOf } from '@/constants/ride';
import { formatDistance, formatMoney } from '@/utils/format';
import { cn } from '@/lib/utils';

const PARCEL_LABELS = { pickup: 'Collect from', destination: 'Deliver to' };

/**
 * A ride offer, counting down to the server's own `expiresAt`.
 *
 * Nothing here starts a 20-second timer of its own: the remaining time is
 * derived from the server timestamp on every tick, so a backgrounded tab, a
 * slow socket or a page reload all land on the correct number, and the backend
 * rejects a late accept regardless of what this shows.
 *
 * Two kinds of job arrive through the same socket event, and the rider has
 * seconds to tell them apart. A parcel is named a delivery in the title, wears
 * a filled badge rather than a quiet one, and labels its two addresses as
 * collect/deliver — because a rider who reads "pickup" and expects a person
 * arrives looking for a passenger who was never there.
 */
export function IncomingRequest({ request, onAccept, onReject, onExpire, busy }) {
  const [action, setAction] = useState(null);

  const { seconds, progress, expired } = useCountdown(request?.expiresAt, {
    onExpire: () => onExpire?.(request)
  });

  if (!request) return null;

  // The service decides the booking type; an explicit one on the payload wins
  // only if the catalogue has never heard of the service. An offer that carries
  // neither is a passenger ride, which is what every offer was before parcels.
  const bookingType =
    bookingTypeOf(request.serviceType) || request.bookingType || BOOKING_TYPE.RIDE;
  const parcel = bookingType === BOOKING_TYPE.PARCEL;
  const serviceLabel = SERVICE_LABEL[request.serviceType] || null;

  const handle = async (kind, fn) => {
    setAction(kind);
    try {
      await fn(request);
    } finally {
      setAction(null);
    }
  };

  return (
    <BottomSheet open dismissible={false} glass label="Incoming ride request">
      <div className="space-y-5 p-5 pb-safe">
        <div className="flex items-center gap-4">
          <CountdownRing progress={progress} seconds={seconds} />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-semibold text-body">
              {expired ? 'Request expired' : parcel ? 'New delivery request' : 'New ride request'}
            </SheetTitle>
            <p className="text-sm text-muted">
              {expired
                ? 'This one timed out — the next request will appear here.'
                : `${formatDistance(request.distanceToPickupKm)} to ${parcel ? 'collection' : 'pickup'}`}
            </p>
          </div>
        </div>

        {serviceLabel && (
          <p
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium',
              parcel ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-sunken text-body'
            )}
          >
            <ServiceIcon serviceType={request.serviceType} className="size-4" />
            <span>
              {parcel ? 'Delivery' : 'Passenger'} · {serviceLabel}
            </span>
          </p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-sunken p-4"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">You earn</p>
              <p className="tabular text-3xl font-semibold text-body">
                {formatMoney(request.estimatedFare, request.currency)}
              </p>
            </div>
            <p className="tabular shrink-0 text-sm text-muted">
              {formatDistance(request.estimatedDistanceKm)} {parcel ? 'delivery' : 'trip'}
            </p>
          </div>

          <RoutePreview
            className="mt-4 border-t border-hair pt-4"
            labels={parcel ? PARCEL_LABELS : undefined}
            pickup={request.pickup?.address}
            destination={request.destination?.address}
          />

          {parcel && (
            <p className="mt-3 text-[12.5px] leading-snug text-muted">
              A package, not a passenger — collect it from the sender and hand it over at the drop.
            </p>
          )}
        </motion.div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            block
            size="lg"
            disabled={busy || expired || action === 'accept'}
            loading={action === 'reject'}
            onClick={() => handle('reject', onReject)}
          >
            {expired ? 'Dismiss' : 'Reject'}
          </Button>

          {!expired && (
            <Button
              block
              size="lg"
              disabled={busy || action === 'reject'}
              loading={action === 'accept'}
              onClick={() => handle('accept', onAccept)}
            >
              <Navigation aria-hidden />
              Accept
            </Button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
