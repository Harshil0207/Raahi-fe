import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { Badge, Card, CardBody, CardHeader, EmptyState, LiveDot, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useRideEvents } from '@/admin/hooks/useRideEvents';
import * as dashboardApi from '@/admin/services/dashboard.api';
import { RIDE_STATUS_LABEL, RIDE_STATUS_TONE } from '@/admin/constants/status';
import { formatMoney, formatRelative, shortAddress } from '@/admin/utils/format';

/**
 * Rides happening now.
 *
 * Refreshed on a socket event rather than a timer: the backend already emits
 * every lifecycle change, so the board updates when a ride actually moves and
 * sits idle when nothing is happening. A slow interval backs it up, in case a
 * socket drops silently.
 */
export function ActiveRidesPanel() {
  const { data, loading, refetch } = useAsync(
    useCallback(() => dashboardApi.activeRides({ limit: 12 }), []),
    []
  );

  const [pulse, setPulse] = useState(0);

  // Any ride event is a reason to re-read the board. Coalesced through a
  // counter so a burst of events during a busy minute is one refetch, not ten.
  useRideEvents(useCallback(() => setPulse((n) => n + 1), []));

  useEffect(() => {
    if (!pulse) return undefined;
    const id = setTimeout(() => refetch(), 400);
    return () => clearTimeout(id);
  }, [pulse, refetch]);

  useEffect(() => {
    const id = setInterval(() => refetch(), 45_000);
    return () => clearInterval(id);
  }, [refetch]);

  const rides = data || [];

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <LiveDot active={rides.length > 0} />
            Rides in flight
          </span>
        }
        description="Updates as rides move"
        action={
          <Link to="/admin/rides?status=ACTIVE" className="text-[12.5px] text-accent hover:underline">
            View all
          </Link>
        }
      />

      {loading && !rides.length ? (
        <CardBody className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardBody>
      ) : rides.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Nothing running"
          description="Rides appear here the moment a customer books."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {rides.map((ride) => (
            <li key={ride.id}>
              <Link
                to={`/admin/rides/${ride.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-body">
                    {shortAddress(ride.pickup)} <span className="text-faint">→</span>{' '}
                    {shortAddress(ride.destination)}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted">
                    {ride.customer?.name || 'Customer'}
                    {ride.rider?.userId?.name ? ` · ${ride.rider.userId.name}` : ' · unassigned'}
                    {' · '}
                    {formatRelative(ride.createdAt)}
                  </p>
                </div>

                <span className="tabular hidden shrink-0 text-[12.5px] text-muted sm:block">
                  {formatMoney(ride.estimatedFare, ride.currency)}
                </span>

                <Badge tone={RIDE_STATUS_TONE[ride.status]} className="shrink-0">
                  {RIDE_STATUS_LABEL[ride.status] || ride.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
