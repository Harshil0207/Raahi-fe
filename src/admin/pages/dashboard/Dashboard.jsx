import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { RangePicker } from '@/admin/components/common/FilterBar';
import { MetricTile } from '@/admin/components/dashboard/MetricTile';
import { ActiveRidesPanel } from '@/admin/components/dashboard/ActiveRidesPanel';
import { TopRidersPanel } from '@/admin/components/dashboard/TopRidersPanel';
import { Button } from '@/admin/components/ui/button';
import { Card, CardBody, CardHeader, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { CompletionChart, DailyBarChart, GrowthChart, RevenueChart, SplitBar } from '@/admin/components/charts/TrendChart';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as dashboardApi from '@/admin/services/dashboard.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import { DEFAULT_RANGE } from '@/admin/constants/ranges';
import { compactMoney, formatDistance, formatMoney, formatNumber, formatPercent } from '@/admin/utils/format';

/**
 * The operational picture.
 *
 * Two bands, kept apart on purpose. The top is what is true right now — riders
 * online, rides in flight, complaints waiting — and does not move when the date
 * filter does. Everything below belongs to the selected window. Mixing the two
 * is how a dashboard ends up telling someone there are three rides in progress
 * last Tuesday.
 *
 * Every figure is a server-side aggregate. Nothing here counts rows in the
 * browser.
 */
export default function Dashboard() {
  const { can } = useAuth();
  const [window_, setWindow] = useState({ range: DEFAULT_RANGE, from: '', to: '' });

  /**
   * A custom range with only one end chosen is not a range yet, so it resolves
   * to null and no request goes out — otherwise every keystroke in the date
   * field would fire two aggregate queries.
   *
   * Memoised so it is a stable dependency for the two fetches below.
   */
  const params = useMemo(() => {
    if (window_.range === 'custom' && !(window_.from && window_.to)) return null;

    return {
      range: window_.range,
      ...(window_.from ? { from: window_.from } : {}),
      ...(window_.to ? { to: window_.to } : {})
    };
  }, [window_]);

  const summary = useAsync(
    useCallback(() => (params ? dashboardApi.summary(params) : Promise.resolve(null)), [params]),
    [params]
  );
  const series = useAsync(
    useCallback(() => (params ? dashboardApi.series(params) : Promise.resolve(null)), [params]),
    [params]
  );

  const refresh = () => {
    summary.refetch();
    series.refetch();
  };

  if (summary.error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState description={summary.error.message} onRetry={refresh} />
      </>
    );
  }

  const live = summary.data?.live;
  const period = summary.data?.period;
  const currency = period?.currency || 'INR';
  const days = series.data?.days || [];
  const money = (value) => formatMoney(value, currency);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={summary.data?.window?.label ? `Figures for ${summary.data.window.label.toLowerCase()}` : undefined}
        actions={
          <>
            <RangePicker
              value={window_.range}
              from={window_.from}
              to={window_.to}
              onChange={(next) => setWindow({ range: next.range, from: next.from || '', to: next.to || '' })}
            />
            <Button size="md" onClick={refresh} aria-label="Refresh">
              <RefreshCw className={summary.loading ? 'animate-spin' : undefined} aria-hidden />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </>
        }
      />

      {/* ---------------------------------------------------------- right now */}
      <section aria-labelledby="live-heading" className="mb-5">
        <h2 id="live-heading" className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-faint">
          Right now
        </h2>

        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 sm:grid-cols-3 xl:grid-cols-6">
          <MetricTile
            label="Rides in flight"
            value={formatNumber(live?.activeRides)}
            loading={summary.loading && !live}
            to={can(PERMISSIONS.RIDES_READ) ? '/rides?status=ACTIVE' : undefined}
            tone={live?.activeRides > 0 ? 'success' : undefined}
          />
          <MetricTile
            label="Riders online"
            value={formatNumber(live?.onlineRiders)}
            hint={live ? `${live.availableRiders} free · ${live.busyRiders} busy` : undefined}
            loading={summary.loading && !live}
            to={can(PERMISSIONS.RIDERS_READ) ? '/riders?isOnline=true' : undefined}
          />
          <MetricTile
            label="Riders offline"
            value={formatNumber(live?.offlineRiders)}
            loading={summary.loading && !live}
            to={can(PERMISSIONS.RIDERS_READ) ? '/riders?isOnline=false' : undefined}
          />
          <MetricTile
            label="Open complaints"
            value={formatNumber(live?.openComplaints)}
            hint={live?.urgentComplaints ? `${live.urgentComplaints} urgent` : undefined}
            tone={live?.urgentComplaints > 0 ? 'danger' : live?.openComplaints > 0 ? 'warning' : undefined}
            loading={summary.loading && !live}
            to={can(PERMISSIONS.COMPLAINTS_READ) ? '/complaints?status=OPEN_ANY' : undefined}
          />
          <MetricTile
            label="Customers"
            value={formatNumber(live?.totalCustomers)}
            loading={summary.loading && !live}
            to={can(PERMISSIONS.USERS_READ) ? '/customers' : undefined}
          />
          <MetricTile
            label="Riders"
            value={formatNumber(live?.totalRiders)}
            loading={summary.loading && !live}
            to={can(PERMISSIONS.RIDERS_READ) ? '/riders' : undefined}
          />
        </div>
      </section>

      {/* ------------------------------------------------- the selected window */}
      <section aria-labelledby="period-heading" className="mb-5">
        <h2 id="period-heading" className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-faint">
          {summary.data?.window?.label || 'Selected range'}
        </h2>

        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0 sm:grid-cols-3 xl:grid-cols-6">
          <MetricTile label="Rides" value={period?.rides ?? 0} animate loading={summary.loading && !period} />
          <MetricTile
            label="Completed"
            value={period?.completedRides ?? 0}
            hint={period?.completionRate != null ? `${formatPercent(period.completionRate)} of rides` : 'No rides yet'}
            animate
            loading={summary.loading && !period}
          />
          <MetricTile
            label="Cancelled"
            value={period?.cancelledRides ?? 0}
            tone={period?.cancelledRides > 0 ? 'warning' : undefined}
            animate
            loading={summary.loading && !period}
          />
          <MetricTile
            label="Revenue"
            value={period ? money(period.revenue) : '—'}
            hint="Settled and unsettled"
            loading={summary.loading && !period}
          />
          <MetricTile
            label="Average fare"
            value={period ? money(period.avgFare) : '—'}
            hint={period ? `over ${formatDistance(period.avgDistanceKm)} average` : undefined}
            loading={summary.loading && !period}
          />
          <MetricTile
            label="New signups"
            value={period ? period.newCustomers + period.newRiders : 0}
            hint={period ? `${period.newCustomers} customers · ${period.newRiders} riders` : undefined}
            animate
            loading={summary.loading && !period}
          />
        </div>
      </section>

      {/* -------------------------------------------------------------- charts */}
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-2">
        <Card>
          <CardHeader title="Rides per day" description="Every request, whatever became of it" />
          <CardBody>
            {series.loading && !days.length ? <Skeleton className="h-40 w-full" /> : <DailyBarChart days={days} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Completed and cancelled" description="How the rides in this range ended" />
          <CardBody>
            {series.loading && !days.length ? <Skeleton className="h-44 w-full" /> : <CompletionChart days={days} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Revenue per day"
            description="Fares recorded on completed rides"
            action={
              period ? <span className="tabular text-[13px] font-semibold text-body">{money(period.revenue)}</span> : null
            }
          />
          <CardBody>
            {series.loading && !days.length ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <RevenueChart days={days} currency={currency} format={(v) => compactMoney(v, currency)} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Growth" description="New customers and riders per day" />
          <CardBody>
            {series.loading && !days.length ? <Skeleton className="h-44 w-full" /> : <GrowthChart days={days} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="How people paid"
            description="Cash collected against UPI"
            action={
              can(PERMISSIONS.PAYMENTS_READ) ? (
                <Link to="/admin/payments" className="text-[12.5px] text-accent hover:underline">
                  All payments
                </Link>
              ) : null
            }
          />
          <CardBody>
            {series.loading && !series.data ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <>
                <SplitBar
                  segments={[
                    {
                      label: 'Cash',
                      value: series.data?.paymentMix?.find((m) => m.method === 'CASH')?.amount || 0,
                      color: 'var(--chart-series-1)'
                    },
                    {
                      label: 'UPI',
                      value: series.data?.paymentMix?.find((m) => m.method === 'UPI')?.amount || 0,
                      color: 'var(--chart-series-2)'
                    }
                  ]}
                  format={money}
                />
                {period?.pendingPayments > 0 && (
                  <p className="mt-3 border-t border-hair pt-3 text-[12.5px] text-muted">
                    <span className="tabular font-medium text-[var(--warning)]">{money(period.pendingPayments)}</span>{' '}
                    is still unsettled in this range.
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Complaints per day" description="Reports filed by customers and riders" />
          <CardBody>
            {series.loading && !days.length ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DailyBarChart days={days} valueKey="complaints" label="complaints" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 [&>*]:min-w-0 xl:grid-cols-2">
        {can(PERMISSIONS.RIDES_READ) && <ActiveRidesPanel />}
        {can(PERMISSIONS.RIDERS_READ) && <TopRidersPanel params={params} currency={currency} />}
      </div>
    </>
  );
}
