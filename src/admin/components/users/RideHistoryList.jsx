import { Link } from 'react-router-dom';
import { Route as RouteIcon } from 'lucide-react';
import { Badge, EmptyState } from '@/admin/components/ui/misc';
import { PAYMENT_STATUS_TONE, RIDE_STATUS_LABEL, RIDE_STATUS_TONE } from '@/admin/constants/status';
import { formatMoney, formatRelative, humanise, shortAddress } from '@/admin/utils/format';

/**
 * Recent rides for one person, on their detail page.
 *
 * Capped by the backend at twenty. A customer with four hundred rides does not
 * need all of them on a profile — the Rides screen, filtered to them, is where
 * that belongs, and the link at the bottom goes there.
 */
export function RideHistoryList({ rides, moreHref }) {
  if (!rides?.length) {
    return <EmptyState icon={RouteIcon} title="No rides yet" />;
  }

  return (
    <>
      <ul className="divide-y divide-[var(--border)]">
        {rides.map((ride) => (
          <li key={ride._id}>
            <Link
              to={`/admin/rides/${ride._id}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-body">
                  {shortAddress(ride.pickup?.address, 1)} <span className="text-faint">→</span>{' '}
                  {shortAddress(ride.destination?.address, 1)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {formatRelative(ride.completedAt || ride.createdAt)}
                  {ride.rating?.value ? ` · rated ${ride.rating.value}/5` : ''}
                </p>
              </div>

              <span className="tabular hidden shrink-0 text-[12.5px] text-body sm:block">
                {formatMoney(ride.finalFare ?? ride.estimatedFare, ride.currency)}
              </span>

              {ride.payment?.status && (
                <Badge tone={PAYMENT_STATUS_TONE[ride.payment.status]} className="hidden md:inline-flex">
                  {humanise(ride.payment.status)}
                </Badge>
              )}

              <Badge tone={RIDE_STATUS_TONE[ride.status]} className="shrink-0">
                {RIDE_STATUS_LABEL[ride.status] || ride.status}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>

      {moreHref && rides.length >= 20 && (
        <div className="border-t border-hair px-4 py-2.5">
          <Link to={moreHref} className="text-[12.5px] text-accent hover:underline">
            See every ride
          </Link>
        </div>
      )}
    </>
  );
}
