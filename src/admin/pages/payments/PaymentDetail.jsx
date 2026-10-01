import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BanknoteArrowUp, Info, RotateCw, Undo2 } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { ConfirmDialog } from '@/admin/components/common/Dialog';
import { AuditTrail } from '@/admin/components/common/AuditTrail';
import { Button } from '@/admin/components/ui/button';
import { Badge, Card, CardBody, CardHeader, CopyId, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as paymentApi from '@/admin/services/payment.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_STATUS_TONE } from '@/admin/constants/status';
import { formatDateTime, formatDistance, formatMoney, humanise, shortAddress } from '@/admin/utils/format';

/**
 * One payment, and how its amount was arrived at.
 *
 * The fare breakdown is here because "why was I charged this" is the question
 * this page exists to answer, and the rate the ride was booked at is the whole
 * explanation once the platform's pricing has moved since.
 */
export default function PaymentDetail() {
  const { paymentId } = useParams();
  const { can } = useAuth();
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => paymentApi.detail(paymentId), [paymentId]),
    [paymentId]
  );

  /**
   * Asks the gateway again what became of a refund.
   *
   * The message comes from the server, because whether the reversal was posted
   * is the server's answer to give — a console that announced "refunded" on its
   * own would be the thing this whole flow exists to avoid.
   */
  const reconcile = useCallback(async () => {
    setReconciling(true);
    try {
      const result = await paymentApi.reconcileRefund(paymentId);
      toast.success(result?.posted ? 'Refund confirmed and reversed' : 'The gateway has not settled it yet');
      refetch();
    } catch (err) {
      toast.error(err?.message || 'The gateway could not be reached');
    } finally {
      setReconciling(false);
    }
  }, [paymentId, refetch]);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Payment" back="/payments" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Payment" back="/payments" />
        <ErrorState description={error.message} onRetry={refetch} />
      </>
    );
  }

  const { payment, ride, rider, auditTrail } = data;
  const isCash = payment.method === PAYMENT_METHOD.CASH;
  const settled = payment.status === PAYMENT_STATUS.PAID;
  const canSettle = isCash && !settled && can(PERMISSIONS.PAYMENTS_MANAGE);

  const refundRecord = payment.refund?.merchantRefundId ? payment.refund : null;
  const refundInFlight = Boolean(refundRecord && !refundRecord.settledAt && refundRecord.status !== PAYMENT_STATUS.FAILED);

  // Only a gateway payment can be refunded through the gateway. A cash fare was
  // never taken by one, so asking it to send money back would be asking it to
  // refund a payment it has no record of.
  const canRefund = !isCash && settled && !refundRecord && can(PERMISSIONS.FINANCE_ADJUST);
  const canReconcile = refundInFlight && can(PERMISSIONS.FINANCE_ADJUST);

  return (
    <>
      <PageHeader
        title={formatMoney(payment.amount, payment.currency)}
        back="/payments"
        description={`${payment.method} · ${formatDateTime(payment.createdAt)}`}
        actions={
          <>
            <Badge tone={PAYMENT_STATUS_TONE[payment.status]} dot>
              {humanise(payment.status)}
            </Badge>
            {canSettle && (
              <Button size="md" variant="primary" onClick={() => setConfirmSettle(true)}>
                <BanknoteArrowUp aria-hidden />
                Mark settled
              </Button>
            )}
            {canRefund && (
              <Button size="md" variant="outline" onClick={() => setConfirmRefund(true)}>
                <Undo2 aria-hidden />
                Refund
              </Button>
            )}
            {canReconcile && (
              <Button size="md" variant="outline" loading={reconciling} onClick={reconcile}>
                <RotateCw aria-hidden />
                Check the refund
              </Button>
            )}
          </>
        }
      >
        <p className="mt-1">
          <CopyId id={payment._id} label="payment id" />
        </p>
      </PageHeader>

      {/* Why the button is missing on a UPI payment, said once, plainly. */}
      {!isCash && !settled && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-hair bg-sunken p-3 text-[12.5px]">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-muted">
            A UPI payment can only be settled by the gateway confirming it. Marking it paid from here would be
            recording money that never moved, so the console does not offer it.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Payment" />
          <CardBody className="pt-1">
            <DetailList>
              <DetailRow label="Amount">
                <span className="tabular font-medium">{formatMoney(payment.amount, payment.currency)}</span>
              </DetailRow>
              <DetailRow label="Method">{payment.method}</DetailRow>
              <DetailRow label="Status">
                <Badge tone={PAYMENT_STATUS_TONE[payment.status]}>{humanise(payment.status)}</Badge>
              </DetailRow>
              <DetailRow label="Created">{formatDateTime(payment.createdAt)}</DetailRow>
              <DetailRow label="Updated">{formatDateTime(payment.updatedAt)}</DetailRow>
              <DetailRow label="Settled">
                {payment.settledAt ? formatDateTime(payment.settledAt) : <span className="text-faint">Not yet</span>}
              </DetailRow>
              <DetailRow label="Gateway reference" mono>
                {payment.providerPaymentId || payment.providerOrderId || (
                  <span className="text-faint">None — no gateway is connected</span>
                )}
              </DetailRow>
              {payment.failureReason && <DetailRow label="Failure">{payment.failureReason}</DetailRow>}
            </DetailList>
          </CardBody>
        </Card>

        {refundRecord && (
          <Card>
            <CardHeader
              title="Refund"
              description={
                refundInFlight
                  ? 'Asked for. The ledger has not moved and will not until the gateway confirms it.'
                  : undefined
              }
            />
            <CardBody className="pt-1">
              <DetailList>
                <DetailRow label="Amount">
                  <span className="tabular font-medium">
                    {formatMoney(refundRecord.amount, payment.currency)}
                  </span>
                </DetailRow>
                <DetailRow label="Status">
                  <Badge tone={refundTone(refundRecord)}>{refundLabel(refundRecord)}</Badge>
                </DetailRow>
                <DetailRow label="Requested">{formatDateTime(refundRecord.requestedAt)}</DetailRow>
                <DetailRow label="Confirmed">
                  {refundRecord.settledAt ? (
                    formatDateTime(refundRecord.settledAt)
                  ) : (
                    <span className="text-faint">Not yet</span>
                  )}
                </DetailRow>
                <DetailRow label="Gateway reference" mono>
                  {refundRecord.providerRefundId || <span className="text-faint">None yet</span>}
                </DetailRow>
                {refundRecord.reason && <DetailRow label="Reason">{refundRecord.reason}</DetailRow>}
                {refundRecord.failureReason && (
                  <DetailRow label="Why it failed">{refundRecord.failureReason}</DetailRow>
                )}
              </DetailList>
            </CardBody>
          </Card>
        )}

        {payment.attempts?.length > 0 && (
          <Card>
            <CardHeader
              title="Gateway attempts"
              description="A new merchant order id each time, because gateways refuse a reused one."
            />
            <CardBody className="pt-1">
              <ul className="space-y-2.5">
                {[...payment.attempts].reverse().map((attempt) => (
                  <li
                    key={attempt.merchantOrderId}
                    className="rounded-[var(--radius-card)] border border-hair bg-sunken p-3 text-[12.5px]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="mono min-w-0 break-all text-muted">{attempt.merchantOrderId}</p>
                      <Badge tone={PAYMENT_STATUS_TONE[attempt.status]}>{humanise(attempt.status)}</Badge>
                    </div>
                    <p className="mt-1.5 text-faint">
                      {formatMoney(attempt.amount, payment.currency)}
                      {attempt.paymentMode ? ` · ${attempt.paymentMode}` : ''}
                      {attempt.callbackReceived ? ' · callback received' : ' · no callback'}
                    </p>
                    {attempt.failureReason && (
                      <p className="mt-1 text-[var(--danger)]">{attempt.failureReason}</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="How the fare was reached"
              action={
                ride && can(PERMISSIONS.RIDES_READ) ? (
                  <Link to={`/admin/rides/${payment.rideId}`} className="text-[12.5px] text-accent hover:underline">
                    Open the ride
                  </Link>
                ) : null
              }
            />
            <CardBody className="pt-1">
              {ride ? (
                <DetailList>
                  <DetailRow label="Route">
                    {shortAddress(ride.pickup?.address)} <span className="text-faint">→</span>{' '}
                    {shortAddress(ride.destination?.address)}
                  </DetailRow>
                  <DetailRow label="Distance">{formatDistance(ride.finalDistanceKm)}</DetailRow>
                  <DetailRow label="Rate at booking">
                    <span className="tabular">
                      {formatMoney(ride.pricing?.ratePerKm ?? ride.fareRatePerKm, ride.currency)} per km
                    </span>
                  </DetailRow>
                  {ride.pricing?.baseFare > 0 && (
                    <DetailRow label="Base fare">
                      <span className="tabular">{formatMoney(ride.pricing.baseFare, ride.currency)}</span>
                    </DetailRow>
                  )}
                  <DetailRow label="Final fare">
                    <span className="tabular font-medium">{formatMoney(ride.finalFare, ride.currency)}</span>
                  </DetailRow>
                  <DetailRow label="Completed">{formatDateTime(ride.completedAt)}</DetailRow>
                </DetailList>
              ) : (
                <p className="text-[13px] text-faint">The ride behind this payment could not be loaded.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parties" />
            <CardBody className="pt-1">
              <DetailList>
                <DetailRow label="Customer">
                  {payment.customer ? (
                    can(PERMISSIONS.USERS_READ) ? (
                      <Link to={`/admin/customers/${payment.customer._id}`} className="text-accent hover:underline">
                        {payment.customer.name}
                      </Link>
                    ) : (
                      payment.customer.name
                    )
                  ) : null}
                </DetailRow>
                <DetailRow label="Rider">
                  {rider ? (
                    can(PERMISSIONS.RIDERS_READ) ? (
                      <Link to={`/admin/riders/${rider._id}`} className="text-accent hover:underline">
                        {rider.userId?.name}
                      </Link>
                    ) : (
                      rider.userId?.name
                    )
                  ) : null}
                </DetailRow>
                <DetailRow label="Vehicle" mono>
                  {rider?.vehicle?.numberPlate}
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>
        </div>
      </div>

      {auditTrail?.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="What admins did to this payment" />
          <AuditTrail entries={auditTrail} />
        </Card>
      )}

      <ConfirmDialog
        open={confirmSettle}
        onOpenChange={setConfirmSettle}
        title="Mark this cash payment settled"
        description="Use this when the rider collected the cash but could not confirm it in their app. Both parties are notified and the entry is recorded against your account."
        confirmLabel="Mark it settled"
        requireReason
        reasonLabel="What happened?"
        reasonHint="For example: rider confirmed by phone, app would not load."
        onConfirm={async (note) => {
          await paymentApi.settleCash(paymentId, note);
          toast.success('Payment marked settled');
          refetch();
        }}
      />

      <ConfirmDialog
        open={confirmRefund}
        onOpenChange={setConfirmRefund}
        title="Refund this fare"
        description="This asks the gateway to send the whole fare back. The money has not moved when it returns, and the rider's ledger is not reversed until the gateway confirms — use “Check the refund” after, or wait for the callback."
        confirmLabel="Ask for the refund"
        tone="danger"
        requireReason
        reasonLabel="Why is this being refunded?"
        reasonHint="Goes in the audit log and onto the ledger entries."
        onConfirm={async (reason) => {
          // No amount is sent: the fare is the only amount that can be
          // refunded, and the server would refuse anything else. Letting an
          // operator type a figure here would offer a partial refund that
          // cannot be posted.
          await paymentApi.refund(paymentId, { reason });
          toast.success('Refund requested');
          refetch();
        }}
      />
    </>
  );
}

/** A refund reads as done only once the gateway has said so. */
function refundTone(refund) {
  if (refund.status === PAYMENT_STATUS.FAILED) return 'danger';
  return refund.settledAt ? 'success' : 'warning';
}

function refundLabel(refund) {
  if (refund.status === PAYMENT_STATUS.FAILED) return 'Failed at the gateway';
  return refund.settledAt ? 'Refunded' : 'Waiting on the gateway';
}
