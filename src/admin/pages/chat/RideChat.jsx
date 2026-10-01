import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, MessagesSquare } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import * as chatApi from '@/admin/services/chat.api';
import { formatDateTime, formatTime } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * The conversation between a customer and their rider, read for support.
 *
 * Read-only, and there is no way from here to send a message as either party —
 * an admin who could post as a customer could fabricate the evidence in their
 * own dispute. The backend records every time this page is opened.
 *
 * The banner says so plainly rather than hiding it, because an operator should
 * know they are leaving a trace before they read someone's messages.
 */
export default function RideChat() {
  const { rideId } = useParams();

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => chatApi.forRide(rideId), [rideId]),
    [rideId]
  );

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Ride conversation" back={`/rides/${rideId}`} />
        <Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Ride conversation" back={`/rides/${rideId}`} />
        <ErrorState
          title={error.status === 404 ? 'This ride has no chat' : 'Could not load the conversation'}
          description={
            error.status === 404
              ? 'A conversation is created when a rider accepts, so a ride nobody took has none.'
              : error.message
          }
          onRetry={error.status === 404 ? undefined : refetch}
        />
      </>
    );
  }

  const { conversation, messages } = data;

  return (
    <>
      <PageHeader
        title="Ride conversation"
        back={`/rides/${rideId}`}
        description={`${messages.length} message${messages.length === 1 ? '' : 's'}`}
        actions={
          <Badge tone={conversation.status === 'CLOSED' ? 'neutral' : 'success'}>
            {conversation.status === 'OPEN'
              ? 'Open'
              : conversation.status === 'CLOSING'
                ? 'Closing soon'
                : 'Closed'}
          </Badge>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-hair bg-sunken p-3 text-[12.5px]">
        <Eye className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <p className="text-muted">
          Read-only. Opening this page is recorded in the audit log against your account, and there is no way to
          send a message as either party from here.
        </p>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader
          title="Messages"
          description={
            conversation.closesAt
              ? `Messaging ${conversation.status === 'CLOSED' ? 'closed' : 'closes'} ${formatDateTime(
                  conversation.closesAt
                )}`
              : 'Messaging is open while the ride runs'
          }
        />

        {messages.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Nothing was said"
            description="The chat was available on this ride but neither party used it."
          />
        ) : (
          <CardBody className="space-y-3">
            {messages.map((message) => {
              if (message.senderRole === 'system') {
                return (
                  <p key={message.id} className="text-center text-[11.5px] text-faint">
                    {message.message}
                  </p>
                );
              }

              const fromCustomer = message.senderRole === 'customer';

              return (
                <div
                  key={message.id}
                  className={cn('flex flex-col', fromCustomer ? 'items-start' : 'items-end')}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-[var(--radius-card)] px-3 py-2 text-[13px]',
                      fromCustomer ? 'bg-sunken text-body' : 'bg-[var(--accent-wash)] text-body'
                    )}
                  >
                    {message.message}
                  </div>
                  <p className="mt-1 text-[11px] text-faint">
                    {/* Role, not name: who said it matters, and a name here
                        would be one more copy of personal data on the page. */}
                    {fromCustomer ? 'Customer' : 'Rider'} · {formatTime(message.createdAt)}
                    {message.readAt ? ' · read' : ''}
                  </p>
                </div>
              );
            })}
          </CardBody>
        )}
      </Card>
    </>
  );
}
