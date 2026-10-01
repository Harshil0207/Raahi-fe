import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { RiderLoader } from '@/components/loading/RiderLoader';
import * as paymentApi from '@/services/payment.api';
import { formatMoney } from '@/utils/format';
import { IN_FLIGHT_PAYMENT, PAYMENT_STATUS } from '@/constants/ride';

/**
 * Where the payment gateway sends the customer back to.
 *
 * THIS PAGE DECIDES NOTHING. Arriving here means the customer left the
 * gateway — which they do whether they paid, failed, or changed their mind and
 * pressed back. Anyone can open this URL. So it carries no verdict of its own:
 * it asks our backend, which asks the gateway, and shows whatever comes back.
 *
 * The gateway tells us nothing useful in the redirect either, which is why the
 * ride id is put in the URL when the order is created. Without it this page
 * would not know which payment it had returned from.
 *
 * It polls, because a callback and a returning customer race each other and
 * the customer usually wins. "Being confirmed" is the honest thing to show in
 * the couple of seconds before the gateway answers.
 */
const POLL_MS = 2000;

/** Long enough to cover a slow confirmation; short enough not to look stuck. */
const GIVE_UP_AFTER_MS = 45000;

export function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rideId = params.get('ride');

  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [timedOut, setTimedOut] = useState(false);

  const alive = useRef(true);
  // Stamped in an effect rather than during render: reading the clock while
  // rendering makes the deadline depend on when React happened to run.
  const startedAt = useRef(0);

  useEffect(() => {
    alive.current = true;
    startedAt.current = Date.now();
    return () => {
      alive.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    if (!rideId) return;

    try {
      const result = await paymentApi.getPaymentStatus(rideId);
      if (!alive.current) return;

      setPayment(result);
      setError(null);
    } catch (err) {
      if (!alive.current) return;
      // A failed poll is a network blip. Only a refusal is worth showing,
      // because that one will not fix itself by asking again.
      if (err?.status === 403 || err?.status === 404) setError(err.message);
    }
  }, [rideId]);

  const status = payment?.status;
  const settled = status === PAYMENT_STATUS.PAID || status === PAYMENT_STATUS.FAILED;

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (settled || error || timedOut) return undefined;

    const id = setInterval(() => {
      if (Date.now() - startedAt.current > GIVE_UP_AFTER_MS) {
        setTimedOut(true);
        return;
      }
      check();
    }, POLL_MS);

    return () => clearInterval(id);
  }, [settled, error, timedOut, check]);

  // Somebody opened this page directly, with nothing to look at.
  if (!rideId) return <Navigate to="/" replace />;

  const back = () => navigate(`/ride/${rideId}`, { replace: true });

  return (
    <div className="min-h-dvh bg-app">
      <AppBar title="Payment" />

      <div className="mx-auto max-w-md px-4 pt-6">
        {error && <Outcome tone="danger" title="We could not check that payment" body={error} onBack={back} />}

        {!error && status === PAYMENT_STATUS.PAID && (
          <Outcome
            tone="success"
            title="Payment successful"
            body={`${formatMoney(payment.amount, payment.currency)} received. Your trip is complete.`}
            onBack={back}
            backLabel="Back to your trip"
          />
        )}

        {!error && status === PAYMENT_STATUS.FAILED && (
          <Outcome
            tone="danger"
            title="Payment failed"
            body={payment?.failureReason || 'The payment did not go through. You can try again.'}
            onBack={back}
            backLabel="Try again"
          />
        )}

        {!error && !settled && timedOut && (
          <Outcome
            tone="muted"
            title="Still being confirmed"
            body="Your bank has not confirmed this yet. It will update on your trip screen as soon as it does — you do not need to pay again."
            onBack={back}
            backLabel="Back to your trip"
          />
        )}

        {!error && !settled && !timedOut && (
          <div className="flex flex-col items-center gap-4 pt-10 text-center" aria-live="polite">
            <RiderLoader size="sm" label="Confirming your payment" entrance={false} />
            <p className="max-w-xs text-[13px] leading-relaxed text-muted">
              {IN_FLIGHT_PAYMENT.includes(status) || !status
                ? 'This takes a few seconds. Please do not pay again.'
                : 'Checking with your bank.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Outcome({ tone, title, body, onBack, backLabel = 'Back' }) {
  const shell =
    tone === 'success'
      ? 'border-[var(--success-edge)] bg-[var(--success-wash)]'
      : tone === 'danger'
        ? 'border-[var(--danger-edge)] bg-[var(--danger-wash)]'
        : 'border-hair bg-surface';

  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' ? TriangleAlert : null;
  const iconColour = tone === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]';

  return (
    <div className={`rounded-2xl border p-5 ${shell}`}>
      <div className="flex items-start gap-3">
        {Icon && <Icon className={`mt-0.5 size-6 shrink-0 ${iconColour}`} aria-hidden />}
        <div className="min-w-0">
          <p className="font-semibold text-body">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
        </div>
      </div>

      <Button block className="mt-4" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  );
}

export default PaymentReturn;
