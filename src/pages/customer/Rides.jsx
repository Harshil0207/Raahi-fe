import { useEffect, useState } from 'react';
import { Route } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { plural } from '@/utils/format';
import { RideCard } from '@/components/ride/RideCard';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import * as rideApi from '@/services/ride.api';
import { isActive } from '@/constants/ride';

export default function CustomerRides() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    rideApi
      .listRides({ limit: 50 })
      .then((data) => !cancelled && setRides(data.rides))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title="Your trips" subtitle={rides.length ? plural(rides.length, 'ride') : undefined} />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-[var(--radius-card)]" />)}

        {!loading && error && (
          <EmptyState
            icon={Route}
            title="Couldn't load your trips"
            description={error}
            action={<Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>}
          />
        )}

        {!loading && !error && !rides.length && (
          <EmptyState
            icon={Route}
            title="No trips yet"
            description="Your completed and cancelled rides will show up here."
          />
        )}

        {rides.map((ride) => (
          <RideCard
            key={ride._id}
            ride={ride}
            // A ride still running opens live tracking rather than the summary.
            to={isActive(ride.status) ? `/ride/${ride._id}` : `/rides/${ride._id}`}
          />
        ))}
      </div>
    </div>
  );
}
