import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Gauge, SlidersHorizontal, Smartphone, TrendingUp, Wallet, X } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { ServiceIcon } from '@/components/common/ServiceIcon';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass';
import { Input } from '@/components/ui/input';
import { AnimatedNumber, EmptyState, ErrorState, Skeleton, StatusBadge } from '@/components/ui/misc';
import { BottomSheet, SheetHeader } from '@/components/ui/sheet';
import { EarningsChart } from '@/components/rider/EarningsChart';
import { MetricCard } from '@/components/rider/MetricCard';
import { ICONS } from '@/constants/icons';
import { PAYMENT_STATUS_LABEL } from '@/constants/ride';
import * as riderApi from '@/services/rider.api';
import { formatDateTime, formatDistance, formatMoney, plural, shortAddress } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * Everything on this screen is a figure the backend aggregated. The app picks a
 * window and some filters, sends them, and renders what comes back — it never
 * adds up a list of trips to get a total, because the list is only ever the
 * last ten and the total is all of them.
 */

const PERIODS = [
  // `days` is the width of the trend chart, which is deliberately not the same
  // thing as the window: "today" is one day of money but still a fortnight of
  // trend worth looking at.
  { key: 'today', label: 'Today', days: 7 },
  { key: 'week', label: 'Week', days: 14 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'all', label: 'All', days: 30 }
];

const METHODS = [
  { key: null, label: 'Any' },
  { key: 'CASH', label: 'Cash' },
  { key: 'UPI', label: 'UPI' }
];

const CHART_DAYS = 30;

const BOOKING_ICON = { RIDE: ICONS.ride, PARCEL: ICONS.parcel };

const NO_FILTERS = { range: 'week', serviceType: null, method: null, from: '', to: '' };

export default function RiderEarnings() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [trip, setTrip] = useState(null);

  // Only what is actually set goes on the wire; the endpoint's own defaults
  // cover the rest.
  const query = useMemo(() => {
    const custom = filters.range === 'custom';

    return {
      range: filters.range,
      days: custom ? CHART_DAYS : (PERIODS.find((p) => p.key === filters.range)?.days ?? 14),
      ...(custom && filters.from ? { from: filters.from } : {}),
      ...(custom && filters.to ? { to: filters.to } : {}),
      ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
      ...(filters.method ? { method: filters.method } : {})
    };
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await riderApi.getEarnings(query));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const narrowed = Boolean(filters.serviceType || filters.method || filters.range === 'custom');

  if (error) {
    return (
      <div className="min-h-dvh bg-app pb-safe-nav">
        <AppBar title="Earnings" />
        <ErrorState description={error} onRetry={load} />
      </div>
    );
  }

  if (!data) return <EarningsSkeleton />;

  const { currency, range, unsettled } = data;
  const periods = filters.range === 'custom' ? [...PERIODS, { key: 'custom', label: 'Custom' }] : PERIODS;
  const worked = data.services.filter((s) => s.trips > 0);

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar
        title="Earnings"
        subtitle={`${plural(data.allTime.trips, 'trip')} all time`}
        right={
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-label={narrowed ? 'Change filters' : 'Filter earnings'}
            className="relative grid size-10 place-items-center rounded-full text-body transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <SlidersHorizontal className="size-[18px]" aria-hidden />
            {narrowed && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--accent)]" aria-hidden />
            )}
          </button>
        }
      />

      <div className={cn('space-y-3 px-4 md:mx-auto md:max-w-3xl', loading && 'opacity-60 transition-opacity')}>
        <div role="tablist" aria-label="Earnings period" className="flex gap-1 rounded-full bg-sunken p-1">
          {periods.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={filters.range === p.key}
              onClick={() => setFilters((f) => ({ ...f, range: p.key }))}
              className={cn(
                'h-9 min-w-0 flex-1 truncate rounded-full px-2 text-[13px] font-medium transition-colors',
                filters.range === p.key ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'text-muted'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {narrowed && (
          <div className="flex flex-wrap gap-2">
            {filters.serviceType && (
              <FilterChip
                label={data.services.find((s) => s.serviceType === filters.serviceType)?.label}
                onClear={() => setFilters((f) => ({ ...f, serviceType: null }))}
              />
            )}
            {filters.method && (
              <FilterChip
                label={filters.method === 'CASH' ? 'Cash' : 'UPI'}
                onClear={() => setFilters((f) => ({ ...f, method: null }))}
              />
            )}
            {filters.range === 'custom' && (
              <FilterChip
                label={describeDates(filters.from, filters.to)}
                onClear={() => setFilters((f) => ({ ...f, range: 'week', from: '', to: '' }))}
              />
            )}
          </div>
        )}

        {/* The hero is the one place glass earns its keep on this screen. */}
        <GlassSurface
          cornerRadius={22}
          blurAmount={18}
          saturation={160}
          displacementScale={12}
          aberrationIntensity={1.2}
          padding="20px"
          className="overflow-hidden bg-[var(--accent-wash)]"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted">{range.label}</p>
          <p className="mt-1 text-[38px] font-semibold leading-none tracking-tight text-body">
            <AnimatedNumber value={range.total} format={(n) => formatMoney(n, currency)} />
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="tabular">{plural(range.trips, 'trip')}</span>
            <span className="tabular">{formatDistance(range.distanceKm)}</span>
            {/* Money driven but not collected — trips still awaiting payment.
                This read a figure the server computed from completed rides,
                where it was always zero by construction, so the badge could
                never appear however many fares were outstanding. */}
            {unsettled?.total > 0 && (
              <StatusBadge tone="warning">
                {formatMoney(unsettled.total, currency)} unsettled
              </StatusBadge>
            )}
          </div>
        </GlassSurface>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={Banknote} label="Cash collected" value={formatMoney(range.cash, currency)} />
          <MetricCard icon={Smartphone} label="UPI" value={formatMoney(range.upi, currency)} />
          <MetricCard
            icon={TrendingUp}
            label="Per trip"
            value={range.trips ? formatMoney(range.avgPerTrip, currency) : '—'}
          />
          <MetricCard
            icon={Gauge}
            label="Per km"
            value={range.distanceKm ? formatMoney(range.avgPerKm, currency) : '—'}
          />
        </div>

        {/* Passenger work and delivery work are separate lines, never one total. */}
        <div className="grid grid-cols-2 gap-3">
          {data.bookings.map((b) => (
            <MetricCard
              key={b.bookingType}
              icon={BOOKING_ICON[b.bookingType]}
              value={formatMoney(b.total, currency)}
              hint={`${b.label} · ${plural(b.trips, 'trip')}`}
            />
          ))}
        </div>

        <Card>
          <CardBody className="p-0">
            <p className="px-4 pt-4 pb-1 text-[13px] font-semibold text-body">By service</p>
            {worked.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={narrowed ? 'Nothing matches these filters' : 'No trips in this period'}
                description={
                  narrowed
                    ? 'Try a wider date range, or clear the service and payment filters.'
                    : 'Completed trips appear here, split by the service you ran them on.'
                }
                action={
                  narrowed && (
                    <Button size="sm" variant="subtle" onClick={() => setFilters(NO_FILTERS)}>
                      Clear filters
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="px-4 pb-4">
                {worked.map((s) => (
                  <li key={s.serviceType} className="border-t py-3 first:border-t-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-body">
                        <ServiceIcon serviceType={s.serviceType} className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-body">{s.label}</span>
                        <span className="tabular block text-[11px] text-faint">
                          {plural(s.trips, 'trip')} · {formatDistance(s.distanceKm)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tabular block text-[15px] font-semibold text-body">
                          {formatMoney(s.total, currency)}
                        </span>
                        <span className="tabular block text-[11px] text-faint">
                          {/* An ambulance run is free by design: it is a trip
                              worth nothing, not a missing figure. */}
                          {s.total === 0 ? 'Free service' : `${s.share}% of period`}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--text)_10%,transparent)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${s.share}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            {data.allTime.trips === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No earnings yet"
                description="Complete your first trip and it will show up here."
              />
            ) : (
              <EarningsChart data={data.breakdown} currency={currency} />
            )}
          </CardBody>
        </Card>

        {data.recent.length > 0 && (
          <Card>
            <CardBody className="p-0">
              <p className="px-4 pt-4 pb-2 text-[13px] font-semibold text-body">Recent trips</p>
              <ul>
                {data.recent.map((t) => (
                  <li key={t.rideId}>
                    <button
                      type="button"
                      onClick={() => setTrip(t)}
                      className="flex w-full items-center gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-faint">
                        <ServiceIcon serviceType={t.serviceType} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-body">
                          {shortAddress(t.destination, 1) || 'Trip'}
                        </span>
                        <span className="block truncate text-[11px] text-faint">
                          {t.serviceLabel ? `${t.serviceLabel} · ` : ''}
                          {formatDateTime(t.completedAt)}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-right">
                        <span className="block text-[15px] font-semibold text-body">
                          {formatMoney(t.fare, currency)}
                        </span>
                        <span className="block text-[11px] text-faint">{t.method || '—'}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>

      <FilterSheet
        open={sheet}
        onOpenChange={setSheet}
        filters={filters}
        services={data.services}
        onApply={setFilters}
      />

      <BottomSheet open={Boolean(trip)} onOpenChange={() => setTrip(null)} label="Trip earning">
        {trip && (
          <>
            <SheetHeader title={formatMoney(trip.fare, currency)} description={formatDateTime(trip.completedAt)} />
            <div className="space-y-3 px-5 pb-6 pb-safe">
              <Row label="Service" value={trip.serviceLabel || '—'} />
              <Row label="Distance" value={formatDistance(trip.distanceKm)} />
              <Row label="Payment" value={trip.method || 'Not selected'} />
              {/* The raw enum used to be printed here, so an unpaid fare read
                  as "PENDING" rather than "Payment pending". */}
              <Row label="Status" value={PAYMENT_STATUS_LABEL[trip.paymentStatus] || trip.paymentStatus || '—'} />
              <Row label="Pickup" value={shortAddress(trip.pickup, 2)} />
              <Row label="Destination" value={shortAddress(trip.destination, 2)} />
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

/**
 * The filters, edited as a draft and committed on Apply — changing four things
 * one at a time would be four round trips for one decision.
 */
function FilterSheet({ open, onOpenChange, filters, services, onApply }) {
  const [draft, setDraft] = useState(filters);

  // Reopening starts from whatever is actually applied, not from an abandoned edit.
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const setDates = (patch) => setDraft((d) => ({ ...d, ...patch, range: 'custom' }));

  const commit = () => {
    onApply(draft);
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} label="Filter earnings" detent="full">
      <SheetHeader title="Filters" description="Applies to every figure on this screen" />

      <div className="space-y-5 px-5 pb-6 pb-safe">
        <section>
          <p className="mb-2 text-[13px] font-semibold text-body">Service</p>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              selected={!draft.serviceType}
              onClick={() => setDraft((d) => ({ ...d, serviceType: null }))}
            >
              All services
            </ChoiceChip>
            {services.map((s) => (
              <ChoiceChip
                key={s.serviceType}
                selected={draft.serviceType === s.serviceType}
                onClick={() => setDraft((d) => ({ ...d, serviceType: s.serviceType }))}
              >
                <ServiceIcon serviceType={s.serviceType} className="size-4" />
                {s.label}
              </ChoiceChip>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-[13px] font-semibold text-body">Payment</p>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <ChoiceChip
                key={m.label}
                selected={draft.method === m.key}
                onClick={() => setDraft((d) => ({ ...d, method: m.key }))}
              >
                {m.label}
              </ChoiceChip>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-[13px] font-semibold text-body">Dates</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">From</span>
              <Input
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(e) => setDates({ from: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">To</span>
              <Input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(e) => setDates({ to: e.target.value })}
              />
            </label>
          </div>
          <p className="mt-1.5 text-[11px] text-faint">
            {draft.range === 'custom'
              ? 'Both ends count as whole days.'
              : 'Pick a date to use a custom range instead of the period tabs.'}
          </p>
        </section>

        <div className="flex gap-2">
          <Button variant="outline" block onClick={() => setDraft(NO_FILTERS)}>
            Reset
          </Button>
          <Button block onClick={commit}>
            Apply
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

function ChoiceChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors',
        selected
          ? 'border-transparent bg-[var(--accent)] text-[var(--accent-contrast)]'
          : 'bg-surface text-muted hover:bg-[var(--surface-sunken)]'
      )}
    >
      {children}
    </button>
  );
}

/** An applied filter. The whole chip is the target, and tapping it clears it. */
function FilterChip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Remove ${label} filter`}
      className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-[var(--accent-wash)] pl-3.5 pr-2.5 text-[12px] font-medium text-body transition-colors hover:bg-[var(--surface-sunken)]"
    >
      <span className="truncate">{label}</span>
      <X className="size-3.5 shrink-0 text-muted" aria-hidden />
    </button>
  );
}

/** "3 – 9 Sep", or an open end when only one date was given. */
function describeDates(from, to) {
  const day = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (from && to) return `${day(from)} – ${day(to)}`;
  if (from) return `From ${day(from)}`;
  if (to) return `Until ${day(to)}`;
  return 'Custom range';
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-body">{value}</span>
    </div>
  );
}

function EarningsSkeleton() {
  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title="Earnings" />
      <div className="space-y-3 px-4 md:mx-auto md:max-w-3xl">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-36 w-full rounded-[22px]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-52 w-full rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
