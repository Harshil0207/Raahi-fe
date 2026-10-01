import { useCallback } from 'react';
import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { Pagination } from '@/admin/components/tables/DataTable';
import { AuditTrail } from '@/admin/components/common/AuditTrail';
import { Card, EmptyState, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as auditApi from '@/admin/services/audit.api';

/**
 * Every change an admin has made.
 *
 * Append-only by construction — nothing in the codebase updates or deletes a row
 * — and passwords, tokens and pickup codes are stripped before writing, so this
 * is safe to read and safe to keep.
 */
export default function AuditLogs() {
  const { query, page, setPage, search, setSearch, read, setFilter, reset } = useListQuery({ limit: 30 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => auditApi.list(query), [query]),
    [query]
  );

  return (
    <>
      <PageHeader
        title="Audit log"
        description={
          data?.total != null
            ? `${data.total.toLocaleString('en-IN')} ${data.total === 1 ? 'entry' : 'entries'} — newest first`
            : 'Every admin action, newest first'
        }
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Not searchable — filter instead"
        onReset={reset}
        filters={[
          {
            key: 'resource',
            label: 'Resource',
            value: read('resource', ''),
            onChange: (value) => setFilter('resource', value),
            options: [
              'Setting',
              'Ride',
              'Rider',
              'Customer',
              'Payment',
              'Complaint',
              'ChatConversation',
              'Notification',
              'Admin'
            ].map((resource) => ({ value: resource, label: resource }))
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
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState description={error.message} onRetry={refetch} />
        ) : data?.logs?.length ? (
          <AuditTrail entries={data.logs} showResource />
        ) : (
          <EmptyState
            icon={ScrollText}
            title="Nothing recorded in this range"
            description="Entries appear when an admin changes something."
          />
        )}
        <Pagination page={page} limit={data?.limit || 30} total={data?.total || 0} onPage={setPage} />
      </Card>
    </>
  );
}
