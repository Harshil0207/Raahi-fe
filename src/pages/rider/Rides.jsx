import { useEffect, useState } from 'react';
import { Route } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { RideCard } from '@/components/ride/RideCard';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import * as rideApi from '@/services/ride.api';
import { RIDE_STATUS, isActive } from '@/constants/ride';
import { formatMoney } from '@/utils/format';

export default function RiderRides() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    rideApi
      .listRides({ limit: 50 })
      .then((data) => !cancelled && setRides(data.rides))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const completed = rides.filter((r) => r.status === RIDE_STATUS.COMPLETED);
  const earned = completed.reduce((sum, r) => sum + (r.finalFare || 0), 0);
  const currency = completed[0]?.currency || 'INR';

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title="Your trips" />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        {!loading && completed.length > 0 && (
          <Card>
            <CardBody className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Total earned</p>
                <p className="tabular text-3xl font-semibold text-body">
                  {formatMoney(earned, currency)}
                </p>
              </div>
              <p className="tabular text-sm text-muted">{completed.length} completed</p>
            </CardBody>
          </Card>
        )}

        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-[var(--radius-card)]" />
          ))}

        {!loading && !rides.length && (
          <EmptyState
            icon={Route}
            title="No trips yet"
            description="Go online and accept your first ride — it will show up here."
          />
        )}

        {rides.map((ride) => (
          <RideCard
            key={ride._id}
            ride={ride}
            to={isActive(ride.status) ? `/rider/ride/${ride._id}` : `/rider/ride/${ride._id}`}
          />
        ))}
      </div>
    </div>
  );
}
