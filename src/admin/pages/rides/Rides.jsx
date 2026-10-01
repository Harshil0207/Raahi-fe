import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route as RouteIcon } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { Badge, Card, CopyId } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as rideApi from '@/admin/services/ride.api';
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_STATUS_TONE,
  RIDE_STATUS,
  RIDE_STATUS_LABEL,
  RIDE_STATUS_TONE
} from '@/admin/constants/status';
import { formatDistance, formatMoney, formatRelative, humanise, shortAddress } from '@/admin/utils/format';

/**
 * Every ride, filterable.
 *
 * The search box takes a ride id, which is what an operator actually has when a
 * customer quotes a booking reference; an address search is the fallback. Both
 * happen server-side.
 */
export default function Rides() {
  const navigate = useNavigate();
  const { query, page, setPage, search, setSearch, read, setFilter, reset, searching } = useListQuery({ limit: 25 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => rideApi.list(query), [query]),
    [query]
  );

  const columns = [
    {
      key: 'route',
      header: 'Route',
      primary: true,
      render: (ride) => (
        <div className="min-w-0">
          <p className="truncate">
            {shortAddress(ride.pickup?.address)} <span className="text-faint">→</span>{' '}
            {shortAddress(ride.destination?.address)}
          </p>
          <p className="mt-0.5 hidden text-[11.5px] text-muted lg:block">
            <CopyId id={ride._id} label="ride id" />
          </p>
        </div>
      )
    },
    {
      key: 'people',
      header: 'Customer / rider',
      secondary: true,
      render: (ride) => (
        <div className="min-w-0 text-[12.5px]">
          <p className="truncate text-body">{ride.customer?.name || '—'}</p>
          <p className="truncate text-muted">
            {ride.rider?.userId?.name || <span className="text-faint">No rider assigned</span>}
          </p>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '9rem',
      render: (ride) => (
        <Badge tone={RIDE_STATUS_TONE[ride.status]}>{RIDE_STATUS_LABEL[ride.status] || ride.status}</Badge>
      )
    },
    {
      key: 'fare',
      header: 'Fare',
      align: 'right',
      width: '7rem',
      render: (ride) => (
        <span className="tabular">
          {formatMoney(ride.finalFare ?? ride.estimatedFare, ride.currency)}
          {ride.finalFare == null && <span className="ml-1 text-[11px] text-faint">est</span>}
        </span>
      )
    },
    {
      key: 'distance',
      header: 'Distance',
      align: 'right',
      width: '6.5rem',
      hideBelow: true,
      render: (ride) => (
        <span className="tabular text-muted">
          {formatDistance(ride.finalDistanceKm ?? ride.estimatedDistanceKm)}
        </span>
      )
    },
    {
      key: 'payment',
      header: 'Payment',
      width: '8rem',
      render: (ride) =>
        ride.payment?.status ? (
          <Badge tone={PAYMENT_STATUS_TONE[ride.payment.status]}>
            {ride.payment.method ? `${ride.payment.method} · ` : ''}
            {humanise(ride.payment.status)}
          </Badge>
        ) : (
          <span className="text-faint">—</span>
        )
    },
    {
      key: 'created',
      header: 'Booked',
      align: 'right',
      width: '8rem',
      render: (ride) => <span className="text-muted">{formatRelative(ride.createdAt)}</span>
    }
  ];

  return (
    <>
      <PageHeader
        title="Rides"
        description={data?.total != null ? `${data.total.toLocaleString('en-IN')} matching rides` : undefined}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Ride id or address…"
        onReset={reset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: read('status', ''),
            onChange: (value) => setFilter('status', value),
            options: [
              { value: 'ACTIVE', label: 'Active now' },
              ...Object.values(RIDE_STATUS).map((status) => ({
                value: status,
                label: RIDE_STATUS_LABEL[status] || status
              }))
            ]
          },
          {
            key: 'paymentStatus',
            label: 'Payment',
            value: read('paymentStatus', ''),
            onChange: (value) => setFilter('paymentStatus', value),
            options: Object.values(PAYMENT_STATUS).map((status) => ({ value: status, label: humanise(status) }))
          },
          {
            key: 'paymentMethod',
            label: 'Method',
            value: read('paymentMethod', ''),
            onChange: (value) => setFilter('paymentMethod', value),
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
          rows={data?.rides}
          rowKey={(ride) => ride._id}
          onRowClick={(ride) => navigate(`/admin/rides/${ride._id}`)}
          loading={loading}
          refreshing={searching || (loading && Boolean(data))}
          error={error}
          onRetry={refetch}
          empty={{
            icon: RouteIcon,
            title: 'No rides match',
            description: 'Try a wider date range or clear the filters.'
          }}
        />
        <Pagination page={page} limit={data?.limit || 25} total={data?.total || 0} onPage={setPage} />
      </Card>
    </>
  );
}
