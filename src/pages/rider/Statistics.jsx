import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Route, Star, TrendingUp, XCircle } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Card, CardBody } from '@/components/ui/card';
import { MetricCard } from '@/components/rider/MetricCard';
import { ErrorState, Skeleton } from '@/components/ui/misc';
import * as riderApi from '@/services/rider.api';
import { formatDistance, formatMoney, plural } from '@/utils/format';

export default function RiderStatistics() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setStats(await riderApi.getStats());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="min-h-dvh bg-app pb-safe-nav">
        <AppBar title="Statistics" back="/rider/profile" />
        <ErrorState description={error} onRetry={load} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-dvh bg-app pb-safe-nav">
        <AppBar title="Statistics" back="/rider/profile" />
        <div className="grid grid-cols-2 gap-3 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />
          ))}
        </div>
      </div>
    );
  }

  // A rate needs offers to divide by; until then the honest answer is "no data".
  const pct = (v) => (v == null ? 'Not enough data' : `${v}%`);

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title="Statistics" back="/rider/profile" subtitle="All time" />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={CheckCircle2} label="Trips completed" value={stats.totalTrips} tone="accent" />
          <MetricCard icon={Route} label="Distance driven" value={formatDistance(stats.totalDistanceKm)} />
          <MetricCard
            icon={TrendingUp}
            label="Average per trip"
            value={stats.totalTrips ? formatMoney(stats.avgTripEarning) : '—'}
          />
          <MetricCard icon={Clock} label="Time online" value={formatDuration(stats.onlineSeconds)} />
        </div>

        <Card>
          <CardBody className="space-y-3.5">
            <Rate
              icon={CheckCircle2}
              label="Acceptance rate"
              hint={`${plural(stats.offersReceived, 'ride request')} received`}
              value={pct(stats.acceptanceRate)}
              raw={stats.acceptanceRate}
            />
            <Rate
              icon={XCircle}
              label="Cancellation rate"
              hint={`${stats.cancelledTrips} cancelled of ${plural(stats.cancelledTrips + stats.totalTrips, 'trip')}`}
              value={pct(stats.cancellationRate)}
              raw={stats.cancellationRate}
              inverse
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--warning-wash)] text-[var(--warning)]">
                <Star className="size-[18px] fill-current" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-body">Rating</p>
                <p className="text-[12px] text-muted">
                  {stats.ratingCount ? `From ${stats.ratingCount} rated trips` : 'No ratings yet'}
                </p>
              </div>
            </div>
            <p className="tabular text-2xl font-semibold text-body">{stats.rating ?? '—'}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Rate({ icon: Icon, label, hint, value, raw, inverse = false }) {
  // A high cancellation rate is bad; a high acceptance rate is good.
  const bar = raw == null ? 0 : raw;
  const tone = raw == null ? 'var(--border)' : inverse
    ? raw > 20 ? 'var(--danger)' : 'var(--success)'
    : raw >= 70 ? 'var(--success)' : raw >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[14px] text-body">
          <Icon className="size-4 text-faint" aria-hidden />
          {label}
        </span>
        <span className="tabular text-[14px] font-medium text-body">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${bar}%`, background: tone }} />
      </div>
      <p className="mt-1.5 text-[11px] text-faint">{hint}</p>
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return 'None yet';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}
