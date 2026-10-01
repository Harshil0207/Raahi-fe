import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { MetricTile } from '@/admin/components/dashboard/MetricTile';
import { GatewayPanel } from '@/admin/components/payments/GatewayPanel';
import { Badge, Card, CopyId } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as paymentApi from '@/admin/services/payment.api';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_STATUS_TONE } from '@/admin/constants/status';
import { formatDateTime, formatMoney, humanise, plural } from '@/admin/utils/format';

/**
 * Payments, for reconciliation.
 *
 * The three figures at the top are the totals for the current filter, computed
 * server-side — not the sum of the page on screen, which would be a different
 * and misleading number.
 */
export default function Payments() {
  const navigate = useNavigate();
  const { query, page, setPage, search, setSearch, read, setFilter, reset, searching } = useListQuery({ limit: 25 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => paymentApi.list(query), [query]),
    [query]
  );

  const columns = [
    {
      key: 'amount',
      header: 'Amount',
      primary: true,
      width: '8rem',
      render: (payment) => (
        <span className="tabular font-medium">{formatMoney(payment.amount, payment.currency)}</span>
      )
    },
    {
      key: 'people',
      header: 'Customer / rider',
      secondary: true,
      render: (payment) => (
        <div className="min-w-0 text-[12.5px]">
          <p className="truncate text-body">{payment.customer?.name || '—'}</p>
          <p className="truncate text-muted">{payment.rider?.userId?.name || '—'}</p>
        </div>
      )
    },
    {
      key: 'method',
      header: 'Method',
      width: '6rem',
      render: (payment) => <span className="text-muted">{payment.method}</span>
    },
    {
      key: 'status',
      header: 'Status',
      width: '8rem',
      render: (payment) => (
        <Badge tone={PAYMENT_STATUS_TONE[payment.status]}>{humanise(payment.status)}</Badge>
      )
    },
    {
      key: 'ride',
      header: 'Ride',
      width: '8rem',
      hideBelow: true,
      render: (payment) => <CopyId id={payment.rideId} label="ride id" />
    },
    {
      key: 'created',
      header: 'Created',
      align: 'right',
      width: '11rem',
      render: (payment) => <span className="text-muted">{formatDateTime(payment.createdAt)}</span>
    },
    {
      key: 'settled',
      header: 'Settled',
      align: 'right',
      width: '11rem',
      hideBelow: true,
      render: (payment) =>
        payment.settledAt ? (
          <span className="text-muted">{formatDateTime(payment.settledAt)}</span>
        ) : (
          <span className="text-faint">—</span>
        )
    }
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description={data?.total != null ? plural(data.total, 'payment') : undefined}
      />

      <GatewayPanel />

      {/* Three across only once there is room: at phone width a money figure
          gets truncated, and half a rupee amount is worse than none. */}
      {data?.totals && (
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile label="Total in filter" value={formatMoney(data.totals.amount)} />
          <MetricTile label="Settled" value={formatMoney(data.totals.settled)} tone="success" />
          <MetricTile
            label="Outstanding"
            value={formatMoney(data.totals.outstanding)}
            tone={data.totals.outstanding > 0 ? 'warning' : undefined}
          />
        </div>
      )}

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Ride id…"
        onReset={reset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: read('status', ''),
            onChange: (value) => setFilter('status', value),
            options: Object.values(PAYMENT_STATUS).map((status) => ({ value: status, label: humanise(status) }))
          },
          {
            key: 'method',
            label: 'Method',
            value: read('method', ''),
            onChange: (value) => setFilter('method', value),
            options: Object.values(PAYMENT_METHOD).map((method) => ({ value: method, label: method }))
          },
          {
            key: 'from',
            label: 'From',
            type: 'date',
            value: read('from', ''),
            onChange: (value) => setFilter('from', value)
          },
          {
            key: 'to',
            label: 'To',
            type: 'date',
            value: read('to', ''),
            onChange: (value) => setFilter('to', value)
          }
        ]}
      />

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.payments}
          rowKey={(payment) => payment._id}
          onRowClick={(payment) => navigate(`/admin/payments/${payment._id}`)}
          loading={loading}
          refreshing={searching || (loading && Boolean(data))}
          error={error}
          onRetry={refetch}
          empty={{ icon: CreditCard, title: 'No payments match', description: 'Try a wider date range.' }}
        />
        <Pagination page={page} limit={data?.limit || 25} total={data?.total || 0} onPage={setPage} />
      </Card>
    </>
  );
}
