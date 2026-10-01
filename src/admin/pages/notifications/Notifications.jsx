import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Bell, Megaphone } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { Modal } from '@/admin/components/common/Dialog';
import { Button } from '@/admin/components/ui/button';
import { Field, Input, Select, Textarea } from '@/admin/components/ui/input';
import { Badge, Card } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as notificationApi from '@/admin/services/notification.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import { formatDateTime, humanise, plural } from '@/admin/utils/format';

/**
 * What the platform has been telling people.
 *
 * Useful mostly in a support conversation: knowing a customer was told their
 * rider arrived, and when, settles a lot of arguments.
 */
export default function Notifications() {
  const { can } = useAuth();
  const [composing, setComposing] = useState(false);
  const { query, page, setPage, search, setSearch, read, setFilter, reset } = useListQuery({ limit: 30 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => notificationApi.list(query), [query]),
    [query]
  );

  const columns = [
    {
      key: 'title',
      header: 'Notification',
      primary: true,
      render: (item) => (
        <div className="min-w-0">
          <p className="truncate">{item.title}</p>
          {item.body && <p className="truncate text-[11.5px] text-muted">{item.body}</p>}
        </div>
      )
    },
    {
      key: 'recipient',
      header: 'Recipient',
      secondary: true,
      render: (item) => (
        <div className="min-w-0 text-[12.5px]">
          <p className="truncate text-body">{item.recipient?.name || '—'}</p>
          <p className="truncate capitalize text-muted">{item.recipient?.role}</p>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      width: '10rem',
      render: (item) => <span className="text-muted">{humanise(item.type)}</span>
    },
    {
      key: 'read',
      header: 'Read',
      width: '6rem',
      render: (item) => (
        <Badge tone={item.read ? 'success' : 'neutral'}>{item.read ? 'Read' : 'Unread'}</Badge>
      )
    },
    {
      key: 'sent',
      header: 'Sent',
      align: 'right',
      width: '11rem',
      render: (item) => <span className="text-muted">{formatDateTime(item.createdAt)}</span>
    }
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        description={data?.total != null ? plural(data.total, 'notification') : undefined}
        actions={
          can(PERMISSIONS.NOTIFICATIONS_SEND) ? (
            <Button variant="primary" size="md" onClick={() => setComposing(true)}>
              <Megaphone aria-hidden />
              Send an announcement
            </Button>
          ) : null
        }
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Not searchable — filter instead"
        onReset={reset}
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: read('type', ''),
            onChange: (value) => setFilter('type', value),
            options: [
              'RIDE_ACCEPTED',
              'RIDER_ARRIVED',
              'TRIP_STARTED',
              'TRIP_COMPLETED',
              'RIDE_CANCELLED',
              'PAYMENT_UPDATED',
              'SUPPORT',
              'SYSTEM'
            ].map((type) => ({ value: type, label: humanise(type) }))
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
          rows={data?.notifications}
          loading={loading}
          refreshing={loading && Boolean(data)}
          error={error}
          onRetry={refetch}
          empty={{ icon: Bell, title: 'Nothing sent in this range' }}
        />
        <Pagination page={page} limit={data?.limit || 30} total={data?.total || 0} onPage={setPage} />
      </Card>

      <ComposeModal open={composing} onOpenChange={setComposing} onSent={refetch} />
    </>
  );
}

/**
 * An announcement to a role.
 *
 * It says plainly that this reaches the in-app feed and nothing else, because
 * there is no push provider configured and an operator who thinks they sent a
 * push notification would stop worrying about something they should still worry
 * about.
 */
function ComposeModal({ open, onOpenChange, onSent }) {
  const [values, setValues] = useState({ audience: 'customers', title: '', body: '' });
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const valid = values.title.trim().length >= 3 && values.body.trim().length >= 3;

  async function send() {
    if (!valid || busy) return;

    setBusy(true);
    setFields({});

    try {
      const outcome = await notificationApi.broadcast({
        audience: values.audience,
        title: values.title.trim(),
        body: values.body.trim()
      });
      setResult(outcome);
      toast.success(`Sent to ${outcome.recipients} recipient${outcome.recipients === 1 ? '' : 's'}`);
      onSent();
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function close(next) {
    if (busy) return;
    if (!next) {
      setValues({ audience: 'customers', title: '', body: '' });
      setResult(null);
      setFields({});
    }
    onOpenChange(next);
  }

  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Modal open={open} onOpenChange={close} title="Send an announcement" size="md">
      {result ? (
        <div className="space-y-4 p-4">
          <p className="text-[13.5px] text-body">
            Delivered to <span className="tabular font-medium">{result.recipients}</span> active{' '}
            {result.audience === 'all' ? 'accounts' : result.audience}.
          </p>
          <p className="rounded-[var(--radius-field)] bg-sunken p-3 text-[12.5px] text-muted">
            {result.delivery}. Recipients see it in the app's notification list the next time they open it.
            {result.truncated && ' The audience was capped at 5,000 accounts for this send.'}
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => close(false)}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <Field label="Who gets this">
            {(props) => (
              <Select {...props} value={values.audience} onChange={set('audience')}>
                <option value="customers">Every active customer</option>
                <option value="riders">Every active rider</option>
                <option value="all">Everyone</option>
              </Select>
            )}
          </Field>

          <Field label="Title" error={fields.title}>
            {(props) => (
              <Input
                {...props}
                value={values.title}
                onChange={set('title')}
                maxLength={120}
                placeholder="Scheduled maintenance on Sunday"
              />
            )}
          </Field>

          <Field label="Message" error={fields.body}>
            {(props) => (
              <Textarea
                {...props}
                value={values.body}
                onChange={set('body')}
                rows={4}
                maxLength={500}
                placeholder="What people need to know, in a sentence or two."
              />
            )}
          </Field>

          <p className="rounded-[var(--radius-field)] bg-sunken p-3 text-[12.5px] text-muted">
            This writes to each recipient's in-app notification feed. No push provider is connected, so nothing
            reaches a locked phone. The send is recorded in the audit log against your account.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={!valid} onClick={send}>
              Send
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
