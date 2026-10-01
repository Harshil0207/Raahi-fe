import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { Badge, Card, LiveDot } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as riderApi from '@/admin/services/rider.api';
import { formatDate, formatRelative, plural } from '@/admin/utils/format';
import { VERIFICATION, VERIFICATION_LABEL, VERIFICATION_TONE } from '@/admin/constants/status';

/**
 * The rider fleet.
 *
 * Online and availability are separate filters because they answer different
 * questions: "how many riders are working" and "how many could take a ride right
 * now" are not the same number, and conflating them is how a dispatcher ends up
 * wondering why nobody is picking up.
 */
export default function Riders() {
  const navigate = useNavigate();
  const { query, page, setPage, search, setSearch, read, setFilter, reset, searching } = useListQuery({ limit: 25 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => riderApi.list(query), [query]),
    [query]
  );

  const columns = [
    {
      key: 'name',
      header: 'Rider',
      primary: true,
      render: (rider) => (
        <div className="flex min-w-0 items-center gap-2">
          <LiveDot active={rider.isOnline} />
          <div className="min-w-0">
            <p className="truncate">{rider.user?.name || '—'}</p>
            <p className="mono truncate text-[11.5px] text-muted lg:hidden">{rider.vehicle?.numberPlate}</p>
          </div>
        </div>
      )
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      secondary: true,
      render: (rider) => (
        <div className="min-w-0 text-[12.5px]">
          <p className="mono truncate text-body">{rider.vehicle?.numberPlate || '—'}</p>
          <p className="truncate capitalize text-muted">
            {[rider.vehicle?.color, rider.vehicle?.make, rider.vehicle?.model].filter(Boolean).join(' ') ||
              rider.vehicle?.type}
          </p>
        </div>
      )
    },
    {
      key: 'availability',
      header: 'Availability',
      width: '9rem',
      render: (rider) => {
        if (!rider.isOnline) return <Badge tone="neutral">Offline</Badge>;
        if (rider.activeRideId) return <Badge tone="accent">On a ride</Badge>;
        return <Badge tone="success">Free</Badge>;
      }
    },
    {
      key: 'trips',
      header: 'Trips',
      align: 'right',
      width: '5.5rem',
      render: (rider) => <span className="tabular">{rider.totalRides ?? 0}</span>
    },
    {
      key: 'rating',
      header: 'Rating',
      align: 'right',
      width: '5.5rem',
      render: (rider) =>
        rider.rating != null ? (
          <span className="tabular">{rider.rating}</span>
        ) : (
          // A new rider has nothing to be rated on; a blank is honest where a 0
          // would look like a terrible rider.
          <span className="text-faint">—</span>
        )
    },
    {
      key: 'lastSeen',
      header: 'Location',
      align: 'right',
      width: '8rem',
      hideBelow: true,
      render: (rider) => (
        <span className="text-muted">
          {rider.lastLocationAt ? formatRelative(rider.lastLocationAt) : 'Never sent'}
        </span>
      )
    },
    {
      key: 'joined',
      header: 'Joined',
      align: 'right',
      width: '7.5rem',
      hideBelow: true,
      render: (rider) => <span className="text-muted">{formatDate(rider.createdAt)}</span>
    },
    {
      key: 'verification',
      header: 'Verification',
      width: '8.5rem',
      render: (rider) => (
        <Badge tone={VERIFICATION_TONE[rider.verificationStatus] || 'neutral'}>
          {/* The short word, not the sentence used on the detail page: a
              table cell has no room for "Approved before review existed". */}
          {rider.verificationStatus === VERIFICATION.PENDING
            ? 'Waiting'
            : rider.verificationStatus === VERIFICATION.REJECTED
              ? 'Rejected'
              : 'Approved'}
        </Badge>
      )
    },
    {
      key: 'account',
      header: 'Account',
      width: '6.5rem',
      render: (rider) => (
        <Badge tone={rider.user?.isActive ? 'success' : 'danger'}>
          {rider.user?.isActive ? 'Active' : 'Blocked'}
        </Badge>
      )
    }
  ];

  return (
    <>
      <PageHeader title="Riders" description={data?.total != null ? plural(data.total, 'rider') : undefined} />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Name, email or phone…"
        onReset={reset}
        filters={[
          {
            // First, because it is the only filter attached to a queue of work:
            // somebody signed up and is waiting to hear back.
            key: 'verificationStatus',
            label: 'Verification',
            value: read('verificationStatus', ''),
            onChange: (value) => setFilter('verificationStatus', value),
            options: [
              { value: VERIFICATION.PENDING, label: 'Waiting for review' },
              { value: VERIFICATION.APPROVED, label: 'Approved' },
              { value: VERIFICATION.REJECTED, label: 'Not approved' },
              { value: VERIFICATION.GRANDFATHERED, label: 'Never reviewed' }
            ]
          },
          {
            key: 'isOnline',
            label: 'Online',
            value: read('isOnline', ''),
            onChange: (value) => setFilter('isOnline', value),
            options: [
              { value: 'true', label: 'Online' },
              { value: 'false', label: 'Offline' }
            ]
          },
          {
            key: 'isAvailable',
            label: 'Free',
            value: read('isAvailable', ''),
            onChange: (value) => setFilter('isAvailable', value),
            options: [
              { value: 'true', label: 'Free for a ride' },
              { value: 'false', label: 'Busy' }
            ]
          },
          {
            key: 'isActive',
            label: 'Account',
            value: read('isActive', ''),
            onChange: (value) => setFilter('isActive', value),
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Blocked' }
            ]
          }
        ]}
      />

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.riders}
          onRowClick={(rider) => navigate(`/admin/riders/${rider.id}`)}
          loading={loading}
          refreshing={searching || (loading && Boolean(data))}
          error={error}
          onRetry={refetch}
          empty={{ icon: UserRound, title: 'No riders match', description: 'Try clearing the filters.' }}
        />
        <Pagination page={page} limit={data?.limit || 25} total={data?.total || 0} onPage={setPage} />
      </Card>
    </>
  );
}
