import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ErrorState, Skeleton, StatusBadge } from '@/components/ui/misc';
import { useComplaint } from '@/hooks/useComplaints';
import { useSupportPaths } from '@/hooks/useSupportPaths';
import { COMPLAINT_STATUS, STATUS_LABEL, STATUS_TONE, categoryLabel } from '@/constants/complaint';
import { formatDateTime, formatRelative } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * One report and the conversation on it.
 *
 * Support replies appear as the platform, not as a named agent — which is how
 * the backend stores them, and the right thing: the reporter is dealing with
 * Raahi, not with whoever happened to pick up the ticket.
 */
export default function ComplaintDetail() {
  const { complaintId } = useParams();
  const { complaint, messages, loaded, error, reload, reply } = useComplaint(complaintId);
  const paths = useSupportPaths();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages?.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      await reply(body);
      setDraft('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!loaded) {
    return (
      <div className="min-h-dvh bg-app pb-safe-nav">
        <AppBar title="Report" back={paths.base} />
        <div className="space-y-3 px-4">
          <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-dvh bg-app pb-safe-nav">
        <AppBar title="Report" back={paths.base} />
        <ErrorState description={error || 'This report could not be found.'} onRetry={reload} />
      </div>
    );
  }

  const closed = complaint.status === COMPLAINT_STATUS.CLOSED;

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title={complaint.subject} back={paths.base} subtitle={complaint.reference} />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        <Card>
          <CardBody className="space-y-2.5 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge tone={STATUS_TONE[complaint.status]}>
                {STATUS_LABEL[complaint.status] || complaint.status}
              </StatusBadge>
              <span className="text-[12px] text-muted">Reported {formatRelative(complaint.createdAt)}</span>
            </div>

            <p className="text-[13px] text-muted">
              {categoryLabel(complaint.category)}
              {complaint.rideId && (
                <>
                  {' · '}
                  <Link to={paths.ride(complaint.rideId)} className="text-accent">
                    view the trip
                  </Link>
                </>
              )}
            </p>

            {complaint.status === COMPLAINT_STATUS.OPEN && !complaint.isAssigned && (
              <p className="text-[12.5px] text-faint">
                Received. Support picks reports up in order, most serious first.
              </p>
            )}
          </CardBody>
        </Card>

        {complaint.resolution && (
          <Card className="border-[var(--success)]/40">
            <CardBody className="flex items-start gap-3 py-3.5">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--success)]" aria-hidden />
              <div>
                <p className="text-[14px] font-medium text-body">How this was resolved</p>
                <p className="mt-0.5 text-[13.5px] text-muted">{complaint.resolution}</p>
                {complaint.resolvedAt && (
                  <p className="mt-1 text-[11.5px] text-faint">{formatDateTime(complaint.resolvedAt)}</p>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <div ref={scroller} className="max-h-[52dvh] space-y-3 overflow-y-auto p-4">
            {(messages || []).map((message) => {
              const fromSupport = message.senderRole === 'admin';

              return (
                <div key={message.id} className={cn('flex flex-col', fromSupport ? 'items-start' : 'items-end')}>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14.5px]',
                      fromSupport
                        ? 'bg-sunken text-body'
                        : 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    )}
                  >
                    {message.message}
                  </div>
                  <p className="mt-1 px-1 text-[10.5px] text-faint">
                    {fromSupport ? message.senderName : 'You'} · {formatRelative(message.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>

          {closed ? (
            <div className="flex items-center gap-2 border-t border-hair px-4 py-3.5 text-[13px] text-muted">
              <Lock className="size-4 shrink-0" aria-hidden />
              This report is closed. Open a new one if you still need help.
            </div>
          ) : (
            <div className="border-t border-hair p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={1}
                  maxLength={4000}
                  placeholder="Add to your report…"
                  aria-label="Reply"
                  className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-hair bg-sunken px-3.5 py-3 text-[15px] text-body outline-none placeholder:text-faint focus-visible:border-[var(--accent)]"
                />
                <Button
                  size="icon"
                  variant="primary"
                  className="size-11 shrink-0 rounded-full"
                  disabled={!draft.trim()}
                  loading={sending}
                  onClick={send}
                  aria-label="Send"
                >
                  {!sending && <Send aria-hidden />}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
