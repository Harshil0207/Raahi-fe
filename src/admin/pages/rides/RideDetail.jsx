import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LifeBuoy, MessageSquare, Users, XCircle } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { ConfirmDialog } from '@/admin/components/common/Dialog';
import { RideTimeline } from '@/admin/components/rides/RideTimeline';
import { Button } from '@/admin/components/ui/button';
import { Badge, Card, CardBody, CardHeader, CopyId, EmptyState, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as rideApi from '@/admin/services/ride.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import {
  ACTIVE_RIDE_STATUSES,
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_STATUS_TONE,
  PAYMENT_STATUS_TONE,
  PRIORITY_TONE,
  RIDE_STATUS_LABEL,
  RIDE_STATUS_TONE,
  categoryLabel
} from '@/admin/constants/status';
import { formatDateTime, formatDistance, formatMoney, formatRelative, humanise } from '@/admin/utils/format';

/**
 * Everything the platform knows about one ride.
 *
 * Laid out in the order someone investigating actually needs it: what happened
 * and when, then who was involved, then the money, then what was offered to
 * which riders — which is the first thing to check when a customer says nobody
 * came.
 */
export default function RideDetail() {
  const { rideId } = useParams();
  const { can } = useAuth();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => rideApi.detail(rideId), [rideId]),
    [rideId]
  );

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Ride" back="/rides" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Ride" back="/rides" />
        <ErrorState description={error.message} onRetry={refetch} />
      </>
    );
  }

  const { ride, rider, payment, requests, complaints, chat, timeline } = data;
  const isActive = ACTIVE_RIDE_STATUSES.includes(ride.status);
  const currency = ride.currency;

  async function cancel(reason) {
    await rideApi.cancel(rideId, reason);
    toast.success('Ride cancelled');
    refetch();
  }

  return (
    <>
      <PageHeader
        title="Ride"
        back="/rides"
        description={formatDateTime(ride.createdAt)}
        actions={
          <>
            <Badge tone={RIDE_STATUS_TONE[ride.status]} dot>
              {RIDE_STATUS_LABEL[ride.status] || ride.status}
            </Badge>

            {chat?.exists && can(PERMISSIONS.CHAT_READ) && (
              <Button asChild size="md">
                <Link to={`/admin/rides/${rideId}/chat`}>
                  <MessageSquare aria-hidden />
                  Chat ({chat.messageCount})
                </Link>
              </Button>
            )}

            {isActive && can(PERMISSIONS.RIDES_MANAGE) && (
              <Button variant="dangerOutline" size="md" onClick={() => setConfirmCancel(true)}>
                <XCircle aria-hidden />
                Cancel ride
              </Button>
            )}
          </>
        }
      >
        <p className="mt-1">
          <CopyId id={ride._id} label="ride id" />
        </p>
      </PageHeader>

      <Card className="mb-4">
        <CardHeader title="Timeline" description="Only steps the server recorded a time for" />
        <CardBody>
          <RideTimeline timeline={timeline} />
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Route and fare" />
          <CardBody className="pt-1">
            <DetailList>
              <DetailRow label="Pickup">{ride.pickup?.address}</DetailRow>
              <DetailRow label="Destination">{ride.destination?.address}</DetailRow>
              <DetailRow label="Distance">
                {ride.finalDistanceKm != null ? (
                  <>
                    {formatDistance(ride.finalDistanceKm)}
                    <span className="ml-2 text-[11.5px] text-faint">
                      estimated {formatDistance(ride.estimatedDistanceKm)}
                    </span>
                  </>
                ) : (
                  <>
                    {formatDistance(ride.estimatedDistanceKm)}
                    <span className="ml-2 text-[11.5px] text-faint">estimate</span>
                  </>
                )}
              </DetailRow>
              <DetailRow label="Rate used">
                <span className="tabular">{formatMoney(ride.pricing?.ratePerKm, currency)} per km</span>
                {/* The point of the stored snapshot: this is what the ride was
                    priced at, whatever the current setting says. */}
                <span className="ml-2 text-[11.5px] text-faint">as booked</span>
              </DetailRow>
              {ride.pricing?.baseFare > 0 && (
                <DetailRow label="Base fare">
                  <span className="tabular">{formatMoney(ride.pricing.baseFare, currency)}</span>
                </DetailRow>
              )}
              <DetailRow label="Estimated fare">
                <span className="tabular">{formatMoney(ride.estimatedFare, currency)}</span>
              </DetailRow>
              <DetailRow label="Final fare">
                {ride.finalFare != null ? (
                  <span className="tabular font-medium">{formatMoney(ride.finalFare, currency)}</span>
                ) : (
                  <span className="text-faint">Not settled</span>
                )}
              </DetailRow>
              {ride.rating?.value && (
                <DetailRow label="Customer rating">
                  {ride.rating.value} / 5
                  {ride.rating.comment && <span className="ml-2 text-muted">“{ride.rating.comment}”</span>}
                </DetailRow>
              )}
              {ride.cancellation?.at && (
                <DetailRow label="Cancelled">
                  {formatDateTime(ride.cancellation.at)} by {ride.cancellation.by}
                  {ride.cancellation.reason && (
                    <span className="block text-[12px] text-muted">{ride.cancellation.reason}</span>
                  )}
                </DetailRow>
              )}
            </DetailList>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="pt-1">
              {ride.customer ? (
                <DetailList>
                  <DetailRow label="Name">
                    {can(PERMISSIONS.USERS_READ) ? (
                      <Link to={`/admin/customers/${ride.customer._id}`} className="text-accent hover:underline">
                        {ride.customer.name}
                      </Link>
                    ) : (
                      ride.customer.name
                    )}
                  </DetailRow>
                  <DetailRow label="Phone" mono>
                    {ride.customer.phone}
                  </DetailRow>
                  <DetailRow label="Email">{ride.customer.email}</DetailRow>
                  <DetailRow label="Account">
                    <Badge tone={ride.customer.isActive ? 'success' : 'danger'}>
                      {ride.customer.isActive ? 'Active' : 'Blocked'}
                    </Badge>
                  </DetailRow>
                </DetailList>
              ) : (
                <p className="text-[13px] text-faint">No customer on this ride.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Rider" />
            <CardBody className="pt-1">
              {rider ? (
                <DetailList>
                  <DetailRow label="Name">
                    {can(PERMISSIONS.RIDERS_READ) ? (
                      <Link to={`/admin/riders/${rider._id}`} className="text-accent hover:underline">
                        {rider.userId?.name}
                      </Link>
                    ) : (
                      rider.userId?.name
                    )}
                  </DetailRow>
                  <DetailRow label="Phone" mono>
                    {rider.userId?.phone}
                  </DetailRow>
                  <DetailRow label="Vehicle">
                    <span className="mono">{rider.vehicle?.numberPlate}</span>
                    <span className="ml-2 capitalize text-muted">
                      {[rider.vehicle?.color, rider.vehicle?.make, rider.vehicle?.model]
                        .filter(Boolean)
                        .join(' ') || rider.vehicle?.type}
                    </span>
                  </DetailRow>
                  <DetailRow label="Rating">
                    {rider.rating != null ? `${rider.rating} / 5` : 'Not rated yet'}
                  </DetailRow>
                </DetailList>
              ) : (
                <p className="text-[13px] text-faint">
                  No rider was assigned. The offers below show who was asked.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Payment"
              action={
                payment && can(PERMISSIONS.PAYMENTS_READ) ? (
                  <Link to={`/admin/payments/${payment._id}`} className="text-[12.5px] text-accent hover:underline">
                    Open
                  </Link>
                ) : null
              }
            />
            <CardBody className="pt-1">
              {payment ? (
                <DetailList>
                  <DetailRow label="Amount">
                    <span className="tabular font-medium">{formatMoney(payment.amount, payment.currency)}</span>
                  </DetailRow>
                  <DetailRow label="Method">{payment.method}</DetailRow>
                  <DetailRow label="Status">
                    <Badge tone={PAYMENT_STATUS_TONE[payment.status]}>{humanise(payment.status)}</Badge>
                  </DetailRow>
                  <DetailRow label="Settled">
                    {payment.settledAt ? formatDateTime(payment.settledAt) : 'Not yet'}
                  </DetailRow>
                  {payment.providerPaymentId && (
                    <DetailRow label="Reference" mono>
                      {payment.providerPaymentId}
                    </DetailRow>
                  )}
                </DetailList>
              ) : (
                <p className="text-[13px] text-faint">
                  No payment record — one is created when the trip completes.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Who was offered this ride"
            description="The 20-second window each rider had"
          />
          {requests?.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {requests.map((request) => (
                <li key={request._id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                  <span className="min-w-0 flex-1">
                    <CopyId id={request.riderId} label="rider id" />
                    <span className="ml-2 text-muted">
                      {formatDistance(request.distanceToPickupKm)} away
                    </span>
                  </span>
                  <span className="shrink-0 text-muted">
                    {request.respondedAt ? formatRelative(request.respondedAt) : 'no response'}
                  </span>
                  <Badge
                    tone={
                      request.status === 'ACCEPTED'
                        ? 'success'
                        : request.status === 'REJECTED'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {humanise(request.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Users}
              title="No riders were offered this ride"
              description="Nobody was online and available within the matching radius when it was booked."
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Complaints about this ride" />
          {complaints?.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {complaints.map((complaint) => (
                <li key={complaint.id}>
                  <Link
                    to={`/admin/complaints/${complaint.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-body">{complaint.subject}</span>
                      <span className="block text-[11.5px] text-muted">
                        {complaint.reference} · {categoryLabel(complaint.category)} · from the{' '}
                        {complaint.userRole}
                      </span>
                    </span>
                    <Badge tone={PRIORITY_TONE[complaint.priority]}>{humanise(complaint.priority)}</Badge>
                    <Badge tone={COMPLAINT_STATUS_TONE[complaint.status]}>
                      {COMPLAINT_STATUS_LABEL[complaint.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={LifeBuoy} title="No complaints" description="Nobody has reported a problem." />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this ride"
        description="The rider is freed, any pending offers are withdrawn and both sides are notified. Use this for a ride that neither party can end — not to undo a booking on request."
        confirmLabel="Cancel the ride"
        tone="danger"
        requireReason
        reasonLabel="Why are you cancelling?"
        reasonHint="Both the audit log and whoever reviews this will read it."
        onConfirm={cancel}
      />
    </>
  );
}
