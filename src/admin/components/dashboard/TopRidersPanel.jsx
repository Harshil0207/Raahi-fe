import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { Card, CardBody, CardHeader, EmptyState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import * as dashboardApi from '@/admin/services/dashboard.api';
import { formatDistance, formatMoney, plural } from '@/admin/utils/format';

/**
 * Who drove the most in the selected window.
 *
 * Earnings rather than trips, because a rider doing many short hops and one
 * doing long trips are both valuable, and money is the figure operations is
 * asked about. Ranked server-side over an indexed range.
 */
export function TopRidersPanel({ params, currency = 'INR' }) {
  // The caller memoises `params`, so it is a stable dependency here.
  const { data, loading } = useAsync(
    useCallback(
      () => (params ? dashboardApi.topRiders({ ...params, limit: 8 }) : Promise.resolve([])),
      [params]
    ),
    [params]
  );

  const riders = data || [];
  const best = riders[0]?.earnings || 0;

  return (
    <Card>
      <CardHeader title="Busiest riders" description="By fares earned in this range" />

      {loading && !riders.length ? (
        <CardBody className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardBody>
      ) : riders.length === 0 ? (
        <EmptyState icon={UserRound} title="No completed rides in this range" />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {riders.map((rider, index) => (
            <li key={rider.riderId}>
              <Link
                to={`/admin/riders/${rider.riderId}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
              >
                <span className="tabular w-4 shrink-0 text-[12px] text-faint">{index + 1}</span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-body">{rider.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    {plural(rider.trips, 'trip')} · {formatDistance(rider.distanceKm)}
                    {rider.vehicle?.numberPlate ? ` · ${rider.vehicle.numberPlate}` : ''}
                  </p>
                </div>

                <div className="w-24 shrink-0 text-right">
                  <p className="tabular text-[13px] font-medium text-body">
                    {formatMoney(rider.earnings, currency)}
                  </p>
                  {/* A bar relative to the top earner, so the spread is visible
                      without reading every figure. */}
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--chart-track)]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${best > 0 ? Math.max((rider.earnings / best) * 100, 4) : 0}%`,
                        background: 'var(--chart-series-1)'
                      }}
                    />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
