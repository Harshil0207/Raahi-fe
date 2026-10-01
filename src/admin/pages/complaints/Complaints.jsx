import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { Badge, Card } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import { useListQuery } from '@/admin/hooks/useListQuery';
import { useComplaintCounts } from '@/admin/hooks/useComplaintCounts';
import * as complaintApi from '@/admin/services/complaint.api';
import {
  COMPLAINT_PRIORITY,
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_STATUS_TONE,
  PRIORITY_TONE,
  categoryLabel
} from '@/admin/constants/status';
import { formatDue, formatRelative, humanise, plural } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * The support queue.
 *
 * Ordered worst-first then oldest-first by the backend, which is the order a
 * queue should be worked. The tabs across the top are the views support
 * actually switches between; everything else is a filter.
 */
export default function Complaints() {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const counts = useComplaintCounts(30_000);
  const { query, page, setPage, search, setSearch, read, setFilter, reset, searching } = useListQuery({ limit: 25 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => complaintApi.list(query), [query]),
    [query]
  );

  const status = read('status', '');
  const assigned = read('assignedAdmin', '');
  const overdue = read('overdue', '');

  /** Tabs set several params at once, so each one clears the others' state. */
  const applyTab = (tab) => {
    setFilter('overdue', tab.overdue ? 'true' : '');
    setFilter('assignedAdmin', tab.assignedAdmin || '');
    setFilter('priority', tab.priority || '');
    setFilter('status', tab.status || '');
  };

  const tabs = [
    { id: 'open', label: 'Open', status: 'OPEN_ANY', count: counts?.OPEN_ANY },
    { id: 'urgent', label: 'Urgent', status: 'OPEN_ANY', priority: 'URGENT', count: counts?.URGENT },
    { id: 'overdue', label: 'Past SLA', overdue: true, count: counts?.OVERDUE },
    { id: 'mine', label: 'Assigned to me', assignedAdmin: admin?.id, count: counts?.ASSIGNED_TO_ME },
    { id: 'unassigned', label: 'Unassigned', status: 'OPEN_ANY', assignedAdmin: 'UNASSIGNED' },
    { id: 'resolved', label: 'Resolved', status: 'RESOLVED', count: counts?.RESOLVED },
    { id: 'all', label: 'All' }
  ];

  const activeTab = (() => {
    if (overdue === 'true') return 'overdue';
    if (assigned === 'UNASSIGNED') return 'unassigned';
    if (assigned && assigned === admin?.id) return 'mine';
    if (read('priority', '') === 'URGENT') return 'urgent';
    if (status === 'RESOLVED') return 'resolved';
    if (status === 'OPEN_ANY') return 'open';
    if (!status && !assigned) return 'all';
    return null;
  })();

  const columns = [
    {
      key: 'subject',
      header: 'Complaint',
      primary: true,
      render: (complaint) => (
        <div className="min-w-0">
          <p className="truncate">{complaint.subject}</p>
          <p className="mono truncate text-[11.5px] text-muted">{complaint.reference}</p>
        </div>
      )
    },
    {
      key: 'reporter',
      header: 'From',
      secondary: true,
      render: (complaint) => (
        <div className="min-w-0 text-[12.5px]">
          <p className="truncate text-body">{complaint.reporter?.name || '—'}</p>
          <p className="truncate capitalize text-muted">
            {complaint.userRole} · {categoryLabel(complaint.category)}
          </p>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '6.5rem',
      render: (complaint) => (
        <Badge tone={PRIORITY_TONE[complaint.priority]}>{humanise(complaint.priority)}</Badge>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '10rem',
      render: (complaint) => (
        <Badge tone={COMPLAINT_STATUS_TONE[complaint.status]}>
          {COMPLAINT_STATUS_LABEL[complaint.status] || complaint.status}
        </Badge>
      )
    },
    {
      key: 'due',
      header: 'SLA',
      align: 'right',
      width: '7rem',
      render: (complaint) => {
        const due = formatDue(complaint.dueAt);
        // Only a live complaint has a deadline worth showing.
        if (!['OPEN', 'IN_REVIEW', 'WAITING_FOR_USER', 'WAITING_FOR_RIDER'].includes(complaint.status)) {
          return <span className="text-faint">—</span>;
        }
        return (
          <span className={cn('tabular', due.overdue ? 'font-medium text-[var(--danger)]' : 'text-muted')}>
            {due.label}
          </span>
        );
      }
    },
    {
      key: 'assigned',
      header: 'Owner',
      width: '9rem',
      hideBelow: true,
      render: (complaint) =>
        complaint.assignedTo ? (
          <span className="truncate text-muted">{complaint.assignedTo.name}</span>
        ) : (
          <span className="text-faint">Unassigned</span>
        )
    },
    {
      key: 'filed',
      header: 'Filed',
      align: 'right',
      width: '8rem',
      render: (complaint) => <span className="text-muted">{formatRelative(complaint.createdAt)}</span>
    }
  ];

  return (
    <>
      <PageHeader
        title="Complaints"
        description={data?.total != null ? plural(data.total, 'complaint') : undefined}
      />

      {/* Tabs scroll horizontally on a narrow screen rather than wrapping into
          three rows and pushing the queue off the page. */}
      <div className="mb-3 -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 border-b border-hair pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => applyTab(tab)}
              className={cn(
                'relative flex items-center gap-1.5 whitespace-nowrap rounded-t-[var(--radius-field)] px-3 py-2 text-[13px] transition-colors',
                activeTab === tab.id
                  ? 'font-medium text-accent'
                  : 'text-muted hover:bg-[var(--surface-hover)] hover:text-body'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'tabular rounded-full px-1.5 text-[11px]',
                    tab.id === 'urgent' || tab.id === 'overdue'
                      ? 'bg-[var(--danger-wash)] text-[var(--danger)]'
                      : 'bg-[var(--surface-hover)] text-muted'
                  )}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--accent)]" aria-hidden />
              )}
            </button>
          ))}
        </div>
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Reference or subject…"
        onReset={reset}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            onChange: (value) => setFilter('status', value),
            options: [
              { value: 'OPEN_ANY', label: 'Any open' },
              ...Object.values(COMPLAINT_STATUS).map((s) => ({ value: s, label: COMPLAINT_STATUS_LABEL[s] }))
            ]
          },
          {
            key: 'priority',
            label: 'Priority',
            value: read('priority', ''),
            onChange: (value) => setFilter('priority', value),
            options: Object.values(COMPLAINT_PRIORITY).map((p) => ({ value: p, label: humanise(p) }))
          },
          {
            key: 'userRole',
            label: 'Reporter',
            value: read('userRole', ''),
            onChange: (value) => setFilter('userRole', value),
            options: [
              { value: 'customer', label: 'Customers' },
              { value: 'rider', label: 'Riders' }
            ]
          }
        ]}
      />

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.complaints}
          onRowClick={(complaint) => navigate(`/admin/complaints/${complaint.id}`)}
          loading={loading}
          refreshing={searching || (loading && Boolean(data))}
          error={error}
          onRetry={refetch}
          empty={{
            icon: LifeBuoy,
            title: 'Nothing in this view',
            description: 'A clear queue is good news. Try the All tab to see everything.'
          }}
        />
        <Pagination page={page} limit={data?.limit || 25} total={data?.total || 0} onPage={setPage} />
      </Card>
    </>
  );
}
