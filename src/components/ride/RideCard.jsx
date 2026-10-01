import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/misc';
import { RoutePreview } from './RoutePreview';
import { STATUS_LABEL, STATUS_TONE } from '@/constants/ride';
import { formatDistance, formatDateTime, formatMoney } from '@/utils/format';

export function RideCard({ ride, to }) {
  const fare = ride.finalFare ?? ride.estimatedFare;
  const distance = ride.finalDistanceKm ?? ride.estimatedDistanceKm;

  return (
    <Link
      to={to}
      className="block rounded-[var(--radius-card)] border border-hair bg-elevated p-4 transition-colors hover:bg-[var(--surface-sunken)]"
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge tone={STATUS_TONE[ride.status]}>{STATUS_LABEL[ride.status]}</StatusBadge>
        <span className="flex items-center gap-1 text-xs text-muted">
          {formatDateTime(ride.createdAt)}
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      </div>

      <RoutePreview
        compact
        className="mt-3"
        pickup={ride.pickup?.address}
        destination={ride.destination?.address}
      />

      <div className="mt-3 flex items-baseline justify-between border-t border-hair pt-3">
        <span className="tabular text-lg font-semibold text-body">
          {formatMoney(fare, ride.currency)}
        </span>
        <span className="tabular text-sm text-muted">{formatDistance(distance)}</span>
      </div>
    </Link>
  );
}
