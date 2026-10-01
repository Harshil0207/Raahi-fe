import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, RefreshCw, UserRound } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar, RangePicker } from '@/admin/components/common/FilterBar';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { MetricTile } from '@/admin/components/dashboard/MetricTile';
import { Figure } from '@/admin/components/finance/Figure';
import { Button } from '@/admin/components/ui/button';
import { Badge, Card, CardBody, CardHeader, ErrorState, LiveDot, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as financeApi from '@/admin/services/finance.api';
import { WALLET_STATUS, WALLET_STATUS_LABEL, WALLET_STATUS_TONE } from '@/admin/constants/finance';
import { DEFAULT_RANGE, RANGES } from '@/admin/constants/ranges';
import { formatMoney, formatRelative, humanise, plural } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * Platform money, in two views an operator switches between rather than scrolls
 * past: what the window earned, and who owes what right now.
 *
 * The one distinction the screen exists to protect is between ride money and
 * recharge money. Commission is revenue, recognised when a ride completed. A
 * recharge is a rider handing back cash they already collected on the
 * platform's behalf — the same ₹15, arriving a second time. They are in
 * separate blocks, with separate headings, and nothing on this page adds them
 * together.
 */
export default function Finance() {
  const navigate = useNavigate();
  const { query, page, setPage, search, setSearch, read, setFilter, searching } = useListQuery({ limit: 25 });

  const view = read('view', 'overview');
  const overviewing = view !== 'balances';

  const [window_, setWindow] = useState({ range: DEFAULT_RANGE, from: '', to: '' });

  /** A custom range with one end missing is not a range yet, so nothing is sent. */
  const params = useMemo(() => {
    if (window_.range === 'custom' && !(window_.from && window_.to)) return null;

    return {
      range: window_.range,
      ...(window_.from ? { from: window_.from } : {}),
      ...(window_.to ? { to: window_.to } : {})
    };
  }, [window_]);

  // `view` is a tab, not a filter, and has no business in the balances request.
  const balanceQuery = useMemo(() => {
    const { view: _view, ...rest } = query;
    return rest;
  }, [query]);

  const overview = useAsync(
    useCallback(
      () => (overviewing && params ? financeApi.overview(params) : Promise.resolve(null)),
      [overviewing, params]
    ),
    [overviewing, params]
  );

  const provider = useAsync(
    useCallback(() => (overviewing ? financeApi.provider() : Promise.resolve(null)), [overviewing]),
    [overviewing]
  );

  const balances = useAsync(
    useCallback(
      () => (overviewing ? Promise.resolve(null) : financeApi.balances(balanceQuery)),
      [overviewing, balanceQuery]
    ),
    [overviewing, balanceQuery]
  );

  const refresh = () => {
    overview.refetch();
    provider.refetch();
  };

  const currency = overview.data?.currency || 'INR';
  const money = (value) => formatMoney(value, currency);
  const rides = overview.data?.rides;
  const wallets = overview.data?.balances;
  const recharges = overview.data?.recharges;
  const rangeLabel = RANGES.find((range) => range.value === window_.range)?.label || 'Selected range';

  // UPI is switched on in settings but nothing can actually collect it. Rides
  // will be taken that the platform has no way to be paid for.
  const upiBroken = Boolean(provider.data?.upiEnabled && !provider.data?.upiCollectable);

  return (
    <>
      <PageHeader
        title="Finance"
        description="What the platform earned, and what riders owe it."
        actions={
          overviewing ? (
            <>
              <RangePicker
                value={window_.range}
                from={window_.from}
                to={window_.to}
                onChange={(next) => setWindow({ range: next.range, from: next.from || '', to: next.to || '' })}
              />
              <Button size="md" onClick={refresh} aria-label="Refresh">
                <RefreshCw className={overview.loading ? 'animate-spin' : undefined} aria-hidden />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </>
          ) : null
        }
      />

      <div className="mb-3 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 border-b border-hair pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter('view', tab.id === 'overview' ? '' : tab.id)}
              className={cn(
                'relative whitespace-nowrap rounded-t-[var(--radius-field)] px-3 py-2 text-[13px] transition-colors',
                view === tab.id
                  ? 'font-medium text-accent'
                  : 'text-muted hover:bg-[var(--surface-hover)] hover:text-body'
              )}
            >
              {tab.label}
              {view === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--accent)]" aria-hidden />
              )}
            </button>
          ))}
        </div>
      </div>

      {overviewing ? (
        overview.error ? (
          <ErrorState description={overview.error.message} onRetry={refresh} />
        ) : (
          <>
            {upiBroken && (
              <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-[var(--danger-edge)] bg-[var(--danger-wash)] p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
                <div className="min-w-0 text-[12.5px]">
                  <p className="font-medium text-body">UPI is switched on but nothing can collect it.</p>
                  <p className="mt-0.5 text-muted">
                    {provider.data?.unavailableReason ||
                      (provider.data?.payeeConfigured
                        ? 'The provider is not accepting payments.'
                        : 'No payee is configured, so there is nowhere for the money to go.')}{' '}
                    Riders will be offered UPI and no payment will arrive. Turn UPI off in Settings, or fix the
                    provider.
                  </p>
                </div>
              </div>
            )}

            <section aria-labelledby="rides-heading" className="mb-5">
              <h2
                id="rides-heading"
                className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-faint"
              >
                Ride money · {rangeLabel}
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <MetricTile
                  label="Gross ride value"
                  value={rides ? money(rides.gross) : '—'}
                  hint={rides ? plural(rides.rides, 'completed ride') : undefined}
                  loading={overview.loading && !rides}
                />
                <MetricTile
                  label="Platform commission"
                  value={rides ? money(rides.commission) : '—'}
                  hint={
                    rides
                      ? `${rides.effectiveCommissionPercent}% kept · ${overview.data.commissionRate}% configured`
                      : undefined
                  }
                  loading={overview.loading && !rides}
                />
                <MetricTile
                  label="Rider earnings"
                  value={rides ? money(rides.riderEarnings) : '—'}
                  hint="What riders kept"
                  loading={overview.loading && !rides}
                />
                <MetricTile
                  label="Cash ride value"
                  value={rides ? money(rides.cashGross) : '—'}
                  hint={rides ? `${plural(rides.cashRides, 'ride')} · ${money(rides.cashCommission)} owed back` : undefined}
                  loading={overview.loading && !rides}
                />
                <MetricTile
                  label="UPI ride value"
                  value={rides ? money(rides.upiGross) : '—'}
                  hint={rides ? `${plural(rides.upiRides, 'ride')} · ${money(rides.upiCommission)} commission` : undefined}
                  loading={overview.loading && !rides}
                />
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader
                  title="Outstanding rider balances"
                  description="Where things stand right now, not in the window above — a debt is a debt whenever it was incurred."
                  action={
                    <Link to="/admin/finance?view=balances" className="shrink-0 text-[12.5px] text-accent hover:underline">
                      The queue
                    </Link>
                  }
                />
                <CardBody>
                  {overview.loading && !wallets ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                        <Figure
                          label="Riders owe"
                          value={money(wallets?.outstanding)}
                          tone={wallets?.outstanding > 0 ? 'danger' : undefined}
                          hint={`${plural(wallets?.ridersInDebt ?? 0, 'rider')} behind`}
                        />
                        <Figure
                          label="Payable to riders"
                          value={money(wallets?.payable)}
                          hint="Earned and not yet paid out"
                        />
                        <Figure
                          label="Blocked"
                          value={`${wallets?.blocked ?? 0}`}
                          tone={wallets?.blocked > 0 ? 'danger' : undefined}
                          hint={`of ${plural(wallets?.wallets ?? 0, 'wallet')}`}
                        />
                      </div>

                      <p className="mt-3 border-t border-hair pt-3 text-[12px] text-muted">
                        A rider is taken off the road once they owe more than{' '}
                        <span className="tabular font-medium text-body">{money(wallets?.threshold)}</span>. A trip
                        already in progress is never interrupted by it.
                      </p>
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Recharge collections" description={`Collected in ${rangeLabel.toLowerCase()}`} />
                <CardBody>
                  {overview.loading && !recharges ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                        <Figure label="Collected" value={money(recharges?.collected)} />
                        <Figure label="Recharges" value={`${recharges?.count ?? 0}`} />
                      </div>

                      <div className="mt-3 flex items-start gap-2.5 border-t border-hair pt-3">
                        <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                        <p className="text-[12px] text-muted">
                          This is debt being repaid, not revenue. The commission was earned when the ride completed;
                          a recharge is the rider handing back cash they collected for the platform, so it is never
                          added to the ride figures above.
                        </p>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader
                title="Payment provider"
                description="What is collecting money right now"
                action={
                  provider.data ? (
                    <Badge tone={provider.data.isProduction ? 'success' : 'warning'} className="shrink-0">
                      {provider.data.isProduction ? 'Production' : 'Sandbox'}
                    </Badge>
                  ) : null
                }
              />
              <CardBody className="pt-1">
                {provider.error ? (
                  <p className="text-[13px] text-faint">
                    The provider state could not be read: {provider.error.message}
                  </p>
                ) : !provider.data ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <DetailList>
                    <DetailRow label="Provider">{provider.data.label || humanise(provider.data.id)}</DetailRow>
                    <DetailRow label="Accepting payments">
                      <Badge tone={provider.data.available ? 'success' : 'danger'}>
                        {provider.data.available ? 'Yes' : 'No'}
                      </Badge>
                      {!provider.data.available && provider.data.unavailableReason && (
                        <span className="ml-2 text-muted">{provider.data.unavailableReason}</span>
                      )}
                    </DetailRow>
                    <DetailRow label="UPI offered">
                      <Badge tone={provider.data.upiEnabled ? 'accent' : 'neutral'}>
                        {provider.data.upiEnabled ? 'On' : 'Off'}
                      </Badge>
                      <span className="ml-2 text-muted">from settings</span>
                    </DetailRow>
                    <DetailRow label="UPI collectable">
                      <Badge tone={provider.data.upiCollectable ? 'success' : upiBroken ? 'danger' : 'neutral'}>
                        {provider.data.upiCollectable ? 'Yes' : 'No'}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Payee">
                      {provider.data.payeeConfigured ? (
                        'Configured'
                      ) : (
                        <span className="text-faint">None — no address for the money to reach</span>
                      )}
                    </DetailRow>
                  </DetailList>
                )}
              </CardBody>
            </Card>
          </>
        )
      ) : (
        <>
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Name, email or phone…"
            onReset={() => {
              setSearch('');
              setFilter('status', '');
            }}
            filters={[
              {
                key: 'status',
                label: 'Wallets',
                value: read('status', ''),
                onChange: (value) => setFilter('status', value),
                options: Object.values(WALLET_STATUS).map((value) => ({
                  value,
                  label: WALLET_STATUS_LABEL[value]
                }))
              }
            ]}
          />

          <Card className="overflow-hidden">
            <DataTable
              columns={BALANCE_COLUMNS}
              rows={balances.data?.riders}
              rowKey={(row) => row.riderId}
              onRowClick={(row) => navigate(`/admin/riders/${row.riderId}#finance`)}
              loading={balances.loading}
              refreshing={searching || (balances.loading && Boolean(balances.data))}
              error={balances.error}
              onRetry={balances.refetch}
              empty={{
                icon: UserRound,
                title: 'No rider wallets match',
                description: 'Try clearing the filters.'
              }}
            />
            <Pagination
              page={page}
              limit={balances.data?.limit || 25}
              total={balances.data?.total || 0}
              onPage={setPage}
            />
          </Card>

          {balances.data?.threshold != null && (
            <p className="mt-2 text-[12px] text-muted">
              A rider is blocked once they owe more than{' '}
              <span className="tabular font-medium text-body">
                {formatMoney(balances.data.threshold, balances.data.riders?.[0]?.currency)}
              </span>
              . Ordered by what is owed, largest first.
            </p>
          )}
        </>
      )}
    </>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'balances', label: 'Rider balances' }
];

/** Each wallet carries its own currency, so no row borrows another's. */
const BALANCE_COLUMNS = [
  {
    key: 'rider',
    header: 'Rider',
    primary: true,
    render: (row) => (
      <div className="flex min-w-0 items-center gap-2">
        <LiveDot active={row.isOnline} />
        <div className="min-w-0">
          <p className="truncate">{row.name || '—'}</p>
          <p className="mono truncate text-[11.5px] text-muted lg:hidden">{row.vehicle?.numberPlate}</p>
        </div>
      </div>
    )
  },
  {
    key: 'vehicle',
    header: 'Vehicle',
    secondary: true,
    render: (row) => (
      <div className="min-w-0 text-[12.5px]">
        <p className="mono truncate text-body">{row.vehicle?.numberPlate || '—'}</p>
        <p className="truncate text-muted">{row.phone || row.email}</p>
      </div>
    )
  },
  {
    key: 'status',
    header: 'Wallet',
    width: '10rem',
    render: (row) => (
      <Badge tone={WALLET_STATUS_TONE[row.status] || 'neutral'} dot={row.status === WALLET_STATUS.PAYMENT_REQUIRED}>
        {WALLET_STATUS_LABEL[row.status] || humanise(row.status)}
      </Badge>
    )
  },
  {
    key: 'outstanding',
    header: 'Owes',
    align: 'right',
    width: '7.5rem',
    render: (row) =>
      row.outstanding > 0 ? (
        // `whitespace-normal` because the card view wraps every cell in a
        // truncate, and a clipped amount reads as a smaller debt.
        <span className="tabular whitespace-normal break-words font-medium text-[var(--danger)]">
          {formatMoney(row.outstanding, row.currency)}
        </span>
      ) : (
        // Nothing owed is the ordinary case; a 0.00 in every row would drown out
        // the ones that matter.
        <span className="text-faint">—</span>
      )
  },
  {
    key: 'available',
    header: 'Payable',
    align: 'right',
    width: '7.5rem',
    render: (row) =>
      row.available > 0 ? (
        <span className="tabular whitespace-normal break-words">{formatMoney(row.available, row.currency)}</span>
      ) : (
        <span className="text-faint">—</span>
      )
  },
  {
    key: 'lifetimeEarnings',
    header: 'Earned',
    align: 'right',
    width: '8rem',
    hideBelow: true,
    render: (row) => (
      <span className="tabular whitespace-normal break-words text-muted">
        {formatMoney(row.lifetimeEarnings, row.currency)}
      </span>
    )
  },
  {
    key: 'lastEntryAt',
    header: 'Last movement',
    align: 'right',
    width: '9rem',
    hideBelow: true,
    render: (row) => <span className="text-muted">{row.lastEntryAt ? formatRelative(row.lastEntryAt) : 'Never'}</span>
  }
];
