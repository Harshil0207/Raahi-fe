import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { Badge, Card } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as customerApi from '@/admin/services/customer.api';
import { formatDate, formatMoney, formatRelative, plural } from '@/admin/utils/format';

/** The customer list. Search runs on the server across name, email and phone. */
export default function Customers() {
  const navigate = useNavigate();
  const { query, page, setPage, search, setSearch, read, setFilter, reset, searching } = useListQuery({ limit: 25 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => customerApi.list(query), [query]),
    [query]
  );

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      primary: true,
      render: (customer) => (
        <div className="min-w-0">
          <p className="truncate">{customer.name}</p>
          <p className="truncate text-[11.5px] text-muted lg:hidden">{customer.phone}</p>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact',
      secondary: true,
      render: (customer) => (
        <div className="min-w-0 text-[12.5px]">
          <p className="truncate text-body">{customer.email}</p>
          <p className="mono truncate text-muted">{customer.phone}</p>
        </div>
      )
    },
    {
      key: 'rides',
      header: 'Rides',
      align: 'right',
      width: '6rem',
      render: (customer) => (
        <span className="tabular">
          {customer.stats.rides}
          {customer.stats.rides > 0 && (
            <span className="ml-1 text-[11px] text-faint">{customer.stats.completed} done</span>
          )}
        </span>
      )
    },
    {
      key: 'spend',
      header: 'Spend',
      align: 'right',
      width: '7rem',
      hideBelow: true,
      render: (customer) => <span className="tabular text-muted">{formatMoney(customer.stats.spend)}</span>
    },
    {
      key: 'lastRide',
      header: 'Last ride',
      align: 'right',
      width: '8rem',
      render: (customer) => (
        <span className="text-muted">
          {customer.stats.lastRideAt ? formatRelative(customer.stats.lastRideAt) : 'Never'}
        </span>
      )
    },
    {
      key: 'joined',
      header: 'Joined',
      align: 'right',
      width: '7.5rem',
      hideBelow: true,
      render: (customer) => <span className="text-muted">{formatDate(customer.createdAt)}</span>
    },
    {
      key: 'status',
      header: 'Account',
      width: '6.5rem',
      render: (customer) => (
        <Badge tone={customer.isActive ? 'success' : 'danger'}>{customer.isActive ? 'Active' : 'Blocked'}</Badge>
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description={data?.total != null ? plural(data.total, 'customer') : undefined}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Name, email or phone…"
        onReset={reset}
        filters={[
          {
            key: 'isActive',
            label: 'Account',
            value: read('isActive', ''),
            onChange: (value) => setFilter('isActive', value),
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Blocked' }
            ]
          },
          {
            key: 'from',
            label: 'Joined from',
            type: 'date',
            value: read('from', ''),
            onChange: (value) => setFilter('from', value)
          },
          {
            key: 'to',
            label: 'Joined to',
            type: 'date',
            value: read('to', ''),
            onChange: (value) => setFilter('to', value)
          }
        ]}
      />

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.customers}
          rowKey={(customer) => customer._id}
          onRowClick={(customer) => navigate(`/admin/customers/${customer._id}`)}
          loading={loading}
          refreshing={searching || (loading && Boolean(data))}
          error={error}
          onRetry={refetch}
          empty={{ icon: Users, title: 'No customers match', description: 'Try a different search or clear the filters.' }}
        />
        <Pagination page={page} limit={data?.limit || 25} total={data?.total || 0} onPage={setPage} />
      </Card>
    </>
  );
}
