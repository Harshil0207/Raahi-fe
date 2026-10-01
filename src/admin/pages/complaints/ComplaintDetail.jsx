import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Route as RouteIcon, Send, StickyNote } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { Button } from '@/admin/components/ui/button';
import { Field, Select, Textarea } from '@/admin/components/ui/input';
import { Badge, Card, CardBody, CardHeader, CopyId, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as complaintApi from '@/admin/services/complaint.api';
import * as adminsApi from '@/admin/services/admins.api';
import * as riderApi from '@/admin/services/rider.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import {
  COMPLAINT_PRIORITY,
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_STATUS_TONE,
  COMPLAINT_TRANSITIONS,
  PRIORITY_TONE,
  categoryLabel
} from '@/admin/constants/status';
import { formatDateTime, formatDue, formatMoney, humanise, shortAddress } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * One complaint: the thread, the context, and the controls to work it.
 *
 * The thread and the internal notes are kept visibly apart, because the cost of
 * confusing them is putting an internal remark in front of an upset customer.
 */
export default function ComplaintDetail() {
  const { complaintId } = useParams();
  const { can } = useAuth();

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => complaintApi.detail(complaintId), [complaintId]),
    [complaintId]
  );

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Complaint" back="/complaints" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Complaint" back="/complaints" />
        <ErrorState description={error.message} onRetry={refetch} />
      </>
    );
  }

  const { complaint, reporter, assignedTo, ride, messages } = data;
  const due = formatDue(complaint.dueAt);
  const manage = can(PERMISSIONS.COMPLAINTS_MANAGE);
  const live = ['OPEN', 'IN_REVIEW', 'WAITING_FOR_USER', 'WAITING_FOR_RIDER'].includes(complaint.status);

  return (
    <>
      <PageHeader
        title={complaint.subject}
        back="/complaints"
        description={`${categoryLabel(complaint.category)} · reported by the ${complaint.userRole}`}
        actions={
          <>
            <Badge tone={PRIORITY_TONE[complaint.priority]}>{humanise(complaint.priority)}</Badge>
            <Badge tone={COMPLAINT_STATUS_TONE[complaint.status]} dot>
              {COMPLAINT_STATUS_LABEL[complaint.status]}
            </Badge>
          </>
        }
      >
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px]">
          <span className="mono text-muted">{complaint.reference}</span>
          {live && (
            <span className={cn('tabular', due.overdue ? 'font-medium text-[var(--danger)]' : 'text-muted')}>
              · {due.label}
            </span>
          )}
        </p>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Thread
            complaint={complaint}
            messages={messages}
            canReply={manage && complaint.status !== COMPLAINT_STATUS.CLOSED}
            onSent={refetch}
          />

          <Notes complaint={complaint} canAdd={manage} onAdded={refetch} />
        </div>

        <div className="space-y-4">
          {manage && <Controls complaint={complaint} assignedTo={assignedTo} onChanged={refetch} />}

          <Card>
            <CardHeader title="Reporter" />
            <CardBody className="pt-1">
              <DetailList>
                <DetailRow label="Name">
                  {reporter ? (
                    complaint.userRole === 'rider' ? (
                      <RiderLink userId={reporter._id} name={reporter.name} />
                    ) : can(PERMISSIONS.USERS_READ) ? (
                      <Link to={`/admin/customers/${reporter._id}`} className="text-accent hover:underline">
                        {reporter.name}
                      </Link>
                    ) : (
                      reporter.name
                    )
                  ) : null}
                </DetailRow>
                <DetailRow label="Phone" mono>
                  {reporter?.phone}
                </DetailRow>
                <DetailRow label="Email">{reporter?.email}</DetailRow>
                <DetailRow label="Account">
                  <Badge tone={reporter?.isActive ? 'success' : 'danger'}>
                    {reporter?.isActive ? 'Active' : 'Blocked'}
                  </Badge>
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The ride"
              action={
                complaint.rideId && can(PERMISSIONS.RIDES_READ) ? (
                  <Link to={`/admin/rides/${complaint.rideId}`} className="text-[12.5px] text-accent hover:underline">
                    View ride
                  </Link>
                ) : null
              }
            />
            <CardBody className="pt-1">
              {ride ? (
                <DetailList>
                  <DetailRow label="Route">
                    {shortAddress(ride.pickup?.address, 1)} <span className="text-faint">→</span>{' '}
                    {shortAddress(ride.destination?.address, 1)}
                  </DetailRow>
                  <DetailRow label="Fare">
                    <span className="tabular">
                      {formatMoney(ride.finalFare ?? ride.estimatedFare, ride.currency)}
                    </span>
                  </DetailRow>
                  <DetailRow label="Status">{humanise(ride.status)}</DetailRow>
                  <DetailRow label="Payment">
                    {ride.payment?.method ? `${ride.payment.method} · ${humanise(ride.payment.status)}` : '—'}
                  </DetailRow>
                  <DetailRow label="Chat">
                    {can(PERMISSIONS.CHAT_READ) ? (
                      <Link to={`/admin/rides/${complaint.rideId}/chat`} className="text-accent hover:underline">
                        Read the conversation
                      </Link>
                    ) : (
                      <span className="text-faint">Needs chat.read</span>
                    )}
                  </DetailRow>
                </DetailList>
              ) : complaint.rideId ? (
                <p className="text-[13px] text-faint">The ride could not be loaded.</p>
              ) : (
                <p className="flex items-start gap-2 text-[13px] text-faint">
                  <RouteIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Not about a specific ride.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timing" />
            <CardBody className="pt-1">
              <DetailList>
                <DetailRow label="Filed">{formatDateTime(complaint.createdAt)}</DetailRow>
                <DetailRow label="SLA target">{formatDateTime(complaint.dueAt)}</DetailRow>
                <DetailRow label="Last message">
                  {complaint.lastMessageAt ? formatDateTime(complaint.lastMessageAt) : 'None'}
                </DetailRow>
                {complaint.resolvedAt && (
                  <DetailRow label="Resolved">{formatDateTime(complaint.resolvedAt)}</DetailRow>
                )}
                {complaint.closedAt && <DetailRow label="Closed">{formatDateTime(complaint.closedAt)}</DetailRow>}
                <DetailRow label="Complaint id">
                  <CopyId id={complaint.id} label="complaint id" />
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * A rider reporter is identified by their user id, but the rider page is keyed
 * by rider id, so the link needs one lookup. If it fails the name still renders
 * as plain text rather than a link that goes nowhere.
 */
function RiderLink({ userId, name }) {
  const { can } = useAuth();
  const allowed = can(PERMISSIONS.RIDERS_READ);

  const { data } = useAsync(
    useCallback(() => (allowed ? riderApi.byUser(userId).catch(() => null) : Promise.resolve(null)), [
      userId,
      allowed
    ]),
    [userId, allowed]
  );

  if (!data?.riderId) return name;

  return (
    <Link to={`/admin/riders/${data.riderId}`} className="text-accent hover:underline">
      {name}
    </Link>
  );
}

/** The conversation the reporter can see. */
function Thread({ complaint, messages, canReply, onSent }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!draft.trim() || busy) return;

    setBusy(true);
    try {
      await complaintApi.reply(complaint.id, draft.trim());
      setDraft('');
      toast.success('Reply sent to the reporter');
      onSent();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Conversation" description="Everything here is visible to the reporter" />

      <CardBody className="space-y-3">
        {messages.map((message) => {
          const fromAdmin = message.senderRole === 'admin';

          return (
            <div key={message.id} className={cn('flex flex-col', fromAdmin ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-card)] px-3 py-2 text-[13px]',
                  fromAdmin ? 'bg-[var(--accent-wash)] text-body' : 'bg-sunken text-body'
                )}
              >
                {message.message}
              </div>
              <p className="mt-1 text-[11px] text-faint">
                {message.senderName} · {formatDateTime(message.createdAt)}
              </p>
            </div>
          );
        })}
      </CardBody>

      {canReply ? (
        <div className="border-t border-hair p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Write a reply the reporter will see…"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-faint">Sent as {complaint.reference} from platform support.</p>
            <Button variant="primary" loading={busy} disabled={!draft.trim()} onClick={send}>
              <Send aria-hidden />
              Send reply
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-hair px-4 py-3 text-[12.5px] text-muted">
          <Lock className="size-3.5" aria-hidden />
          {complaint.status === COMPLAINT_STATUS.CLOSED
            ? 'This complaint is closed. Replying needs a new one.'
            : 'Replying needs the complaints.manage permission.'}
        </div>
      )}
    </Card>
  );
}

/** Internal notes. Never leave the console. */
function Notes({ complaint, canAdd, onAdded }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!draft.trim() || busy) return;

    setBusy(true);
    try {
      await complaintApi.addNote(complaint.id, draft.trim());
      setDraft('');
      toast.success('Note added');
      onAdded();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <StickyNote className="size-3.5 text-muted" aria-hidden />
            Internal notes
          </span>
        }
        description="Only admins see these"
      />

      {complaint.adminNotes?.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {complaint.adminNotes.map((note, index) => (
            <li key={`${note.createdAt}-${index}`} className="px-4 py-2.5">
              <p className="whitespace-pre-wrap text-[13px] text-body">{note.note}</p>
              <p className="mt-1 text-[11px] text-faint">
                {note.adminName} · {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <div className="border-t border-hair p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Context for whoever picks this up next…"
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" loading={busy} disabled={!draft.trim()} onClick={add}>
              Add note
            </Button>
          </div>
        </div>
      )}

      {!canAdd && !complaint.adminNotes?.length && (
        <CardBody>
          <p className="text-[13px] text-faint">No notes.</p>
        </CardBody>
      )}
    </Card>
  );
}

/**
 * Status, priority, owner and resolution.
 *
 * The status picker only offers transitions the backend allows, so support
 * cannot submit a change that comes back refused.
 */
function Controls({ complaint, assignedTo, onChanged }) {
  const { admin, can } = useAuth();
  const [values, setValues] = useState({
    status: '',
    priority: complaint.priority,
    assignedAdmin: complaint.assignedAdmin || '',
    resolution: complaint.resolution || ''
  });
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  // Only a super admin may list admins, so an agent who cannot must not fire
  // the request at all: a guaranteed 403 is noise in the log and a flicker of
  // a picker that was never going to fill.
  const canListAdmins = can(PERMISSIONS.ADMINS_MANAGE);

  const { data: admins } = useAsync(
    useCallback(
      () => (canListAdmins ? adminsApi.list({ isActive: 'true', limit: 100 }).catch(() => null) : Promise.resolve(null)),
      [canListAdmins]
    ),
    [canListAdmins]
  );

  const allowedStatuses = COMPLAINT_TRANSITIONS[complaint.status] || [];
  const resolving = values.status === COMPLAINT_STATUS.RESOLVED;

  const dirty =
    Boolean(values.status) ||
    values.priority !== complaint.priority ||
    values.assignedAdmin !== (complaint.assignedAdmin || '') ||
    values.resolution !== (complaint.resolution || '');

  async function save() {
    if (!dirty || busy) return;

    setBusy(true);
    setFields({});

    try {
      const patch = {};
      if (values.status) patch.status = values.status;
      if (values.priority !== complaint.priority) patch.priority = values.priority;
      if (values.assignedAdmin !== (complaint.assignedAdmin || '')) {
        patch.assignedAdmin = values.assignedAdmin || null;
      }
      if (values.resolution !== (complaint.resolution || '')) patch.resolution = values.resolution.trim();

      await complaintApi.update(complaint.id, patch);
      toast.success('Complaint updated');
      setValues((current) => ({ ...current, status: '' }));
      onChanged();
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Card>
      <CardHeader title="Work this complaint" />
      <CardBody className="space-y-3">
        <Field label="Move to" hint={allowedStatuses.length ? undefined : 'A closed complaint cannot move.'}>
          {(props) => (
            <Select {...props} value={values.status} onChange={set('status')} disabled={!allowedStatuses.length}>
              <option value="">Leave as {COMPLAINT_STATUS_LABEL[complaint.status]}</option>
              {allowedStatuses.map((status) => (
                <option key={status} value={status}>
                  {COMPLAINT_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Priority">
          {(props) => (
            <Select {...props} value={values.priority} onChange={set('priority')}>
              {Object.values(COMPLAINT_PRIORITY).map((priority) => (
                <option key={priority} value={priority}>
                  {humanise(priority)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Owner"
          hint={assignedTo ? `Currently ${assignedTo.name}` : 'Nobody has picked this up'}
        >
          {(props) => (
            <Select {...props} value={values.assignedAdmin} onChange={set('assignedAdmin')}>
              <option value="">Unassigned</option>
              {admin && (
                <option value={admin.id}>
                  {admin.name} (you)
                </option>
              )}
              {(admins?.admins || [])
                .filter((candidate) => candidate.id !== admin?.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>

        <Field
          label="Resolution"
          error={fields.resolution}
          required={resolving}
          hint={resolving ? 'The reporter is shown this when the complaint resolves.' : undefined}
        >
          {(props) => (
            <Textarea
              {...props}
              value={values.resolution}
              onChange={set('resolution')}
              rows={3}
              maxLength={2000}
              placeholder="What was done about it"
            />
          )}
        </Field>

        <Button variant="primary" block loading={busy} disabled={!dirty} onClick={save}>
          Save changes
        </Button>
      </CardBody>
    </Card>
  );
}
