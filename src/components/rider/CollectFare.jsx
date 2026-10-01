import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, CheckCircle2, QrCode, RefreshCw, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import * as paymentApi from '@/services/payment.api';
import { formatMoney } from '@/utils/format';
import { cn } from '@/lib/utils';
import { IN_FLIGHT_PAYMENT, PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/ride';

/**
 * Taking the fare at the drop-off.
 *
 * Two methods, and they settle in genuinely different ways. Cash is confirmed
 * by the rider, because nothing can observe a banknote changing hands and the
 * person holding it is the best witness there is. UPI is confirmed by the
 * payment provider, and there is no button on this screen — or anywhere else in
 * the app — that marks it received. The rider shows a code, and then both of
 * them wait for the same answer.
 *
 * That asymmetry is the point, so the screen says it out loud rather than
 * presenting two buttons that look alike and behave differently.
 */
const POLL_MS = 3000;

export function CollectFare({ ride, payment, methods, onSettled, busy }) {
  const reduced = usePrefersReducedMotion();

  const [method, setMethod] = useState(payment?.method || null);
  const [working, setWorking] = useState(false);
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState(payment?.status || PAYMENT_STATUS.PENDING);
  const [error, setError] = useState(null);

  // Guards the poll against running after the screen has gone.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (payment?.status) setStatus(payment.status);
    if (payment?.method && !method) setMethod(payment.method);
  }, [payment?.status, payment?.method, method]);

  /**
   * Recovers the QR for a collection that is already open.
   *
   * The code itself is not stored on the server — `publicPayment` deliberately
   * carries no image — so it lives only in this component's state, and anything
   * that unmounts the sheet loses it. That used to happen mid-flow; it no longer
   * does, but a reload, a backgrounded tab or a reconnect will still do it, and
   * a rider standing at the kerb with a blank frame has no way forward.
   *
   * Asking again is safe: the server reuses the collection already open rather
   * than starting a second one, so this redraws the same code the customer may
   * already be looking at.
   */
  useEffect(() => {
    if (qr || working) return;
    if (payment?.method !== PAYMENT_METHOD.UPI) return;
    if (!IN_FLIGHT_PAYMENT.includes(payment?.status)) return;

    let cancelled = false;
    paymentApi
      .startUpi(ride._id)
      .then((result) => {
        if (!cancelled && alive.current) setQr(result.qr);
      })
      .catch(() => {
        // Leaves the method selected with its own error path intact; a failed
        // redraw is not worth a second error message on top of whatever the
        // rider is already seeing.
      });

    return () => {
      cancelled = true;
    };
  }, [qr, working, payment?.method, payment?.status, ride._id]);

  const waiting = IN_FLIGHT_PAYMENT.includes(status);
  const settled = status === PAYMENT_STATUS.PAID;

  const cashOption = methods?.find((m) => m.method === PAYMENT_METHOD.CASH);
  const upiOption = methods?.find((m) => m.method === PAYMENT_METHOD.UPI);

  /** Asks the server to re-check with the provider. Never asserts an outcome. */
  const check = useCallback(async () => {
    try {
      const result = await paymentApi.getPaymentStatus(ride._id);
      if (!alive.current) return;

      setStatus(result.status);
      if (result.status === PAYMENT_STATUS.PAID) onSettled?.(result);
      if (result.status === PAYMENT_STATUS.FAILED) {
        setError(result.failureReason || 'The payment did not go through. Try again, or take cash.');
      }
    } catch {
      // A failed poll is a network blip, not a payment failure. Staying quiet
      // and trying again is better than telling a rider their money is gone.
    }
  }, [ride._id, onSettled]);

  useEffect(() => {
    if (!waiting) return undefined;
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [waiting, check]);

  async function choose(next) {
    setError(null);
    setWorking(true);
    try {
      if (next === PAYMENT_METHOD.UPI) {
        const result = await paymentApi.startUpi(ride._id);
        setQr(result.qr);
        setStatus(result.payment.status);
        setMethod(PAYMENT_METHOD.UPI);
      } else {
        const result = await paymentApi.setRiderMethod(ride._id, PAYMENT_METHOD.CASH);
        setQr(null);
        setStatus(result.status);
        setMethod(PAYMENT_METHOD.CASH);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  async function confirmCash() {
    setWorking(true);
    try {
      const result = await paymentApi.collectCash(ride._id);
      setStatus(result.status);
      onSettled?.(result);
      toast.success('Cash confirmed');
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  if (settled) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--success-edge)] bg-[var(--success-wash)] p-4">
        <CheckCircle2 className="size-5 shrink-0 text-[var(--success)]" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-body">Payment received</p>
          <p className="text-[12.5px] text-muted">
            {formatMoney(ride.finalFare, ride.currency)} · {method === PAYMENT_METHOD.CASH ? 'Cash' : 'UPI'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset disabled={working || busy} className="space-y-2">
        <legend className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
          How is the customer paying?
        </legend>

        <div className="grid grid-cols-2 gap-2">
          <MethodButton
            icon={Banknote}
            label="Cash"
            hint="You take the money"
            selected={method === PAYMENT_METHOD.CASH}
            disabled={!cashOption?.enabled}
            onClick={() => choose(PAYMENT_METHOD.CASH)}
          />
          <MethodButton
            icon={QrCode}
            label="UPI"
            hint="They scan and pay"
            selected={method === PAYMENT_METHOD.UPI}
            disabled={!upiOption?.enabled}
            onClick={() => choose(PAYMENT_METHOD.UPI)}
          />
        </div>

        {/* Why a method is off, so a greyed tile is never a dead end without a
            reason. When the options could not be read at all, both tiles are
            disabled and this says so rather than leaving the rider guessing. */}
        {!methods ? (
          <p className="text-[12px] leading-snug text-muted">
            Could not read which payment methods are available. Check your connection and try again.
          </p>
        ) : (
          upiOption &&
          !upiOption.enabled &&
          upiOption.unavailableReason && (
            <p className="text-[12px] leading-snug text-muted">{upiOption.unavailableReason}</p>
          )
        )}
      </fieldset>

      {working && !qr && (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Spinner className="size-4" /> Setting up…
        </p>
      )}

      <AnimatePresence initial={false} mode="wait">
        {method === PAYMENT_METHOD.CASH && (
          <motion.div
            key="cash"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            <Button block size="lg" loading={working || busy} onClick={confirmCash}>
              <Banknote aria-hidden />
              I received {formatMoney(ride.finalFare, ride.currency)}
            </Button>
            <p className="mt-2 text-[12px] leading-snug text-muted">
              Confirming ends the trip and records the fare against your balance.
            </p>
          </motion.div>
        )}

        {method === PAYMENT_METHOD.UPI && qr && (
          <motion.div
            key="upi"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            className="space-y-3"
          >
            <div className="rounded-2xl border border-hair bg-paper p-4">
              <p className="mb-3 text-center text-[13.5px] font-medium text-body">
                Ask the customer to scan and pay
              </p>

              {/* The markup is a QR rendered by our own backend from a payload
                  it built itself — it is our output, not a provider's or a
                  user's. Rendering it as SVG rather than redrawing it here
                  keeps the code the customer scans identical to the one the
                  gateway is expecting.

                  If the image could not be drawn, the payment is still real and
                  still payable — so the link is offered rather than an empty
                  frame the rider would hold up to a customer. */}
              {qr.svg ? (
                <div
                  className="mx-auto grid aspect-square w-full max-w-[15rem] place-items-center [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qr.svg }}
                  role="img"
                  aria-label={`Payment code for ${formatMoney(ride.finalFare, ride.currency)}`}
                />
              ) : (
                <div className="rounded-2xl bg-sunken p-3">
                  <p className="text-center text-[12.5px] leading-snug text-muted">
                    The payment code could not be drawn, but the collection is open. The customer can
                    pay with this instead.
                  </p>
                  {qr.payload && (
                    <code className="mt-2 block break-all text-center text-[11px] leading-snug text-body">
                      {qr.payload}
                    </code>
                  )}
                </div>
              )}

              <p className="tabular mt-3 text-center text-[19px] font-semibold text-body">
                {formatMoney(ride.finalFare, ride.currency)}
              </p>
            </div>

            <div
              className={cn(
                'flex items-center gap-2.5 rounded-2xl p-3 text-[13px]',
                'border border-[var(--warning-edge)] bg-[var(--warning-wash)]'
              )}
              aria-live="polite"
            >
              <Spinner className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 text-body">Waiting for payment…</span>
              <button
                type="button"
                onClick={check}
                className="shrink-0 rounded-full p-2 text-muted hover:text-body"
                aria-label="Check again"
              >
                <RefreshCw className="size-4" aria-hidden />
              </button>
            </div>

            <p className="text-[12px] leading-snug text-muted">
              The trip ends by itself once the payment lands. You cannot mark this one paid — the
              payment provider confirms it.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="flex items-start gap-2 rounded-2xl bg-[var(--danger-wash)] p-3 text-[12.5px] leading-snug text-body">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

function MethodButton({ icon: Icon, label, hint, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-[4.5rem] flex-col items-start gap-1 rounded-2xl border px-3.5 py-3 text-left transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        selected ? 'border-[var(--accent)] bg-[var(--accent-wash)]' : 'border-hair hover:bg-[var(--surface-sunken)]'
      )}
    >
      <Icon className="size-[18px] text-body" aria-hidden />
      <span className="text-[14px] font-semibold text-body">{label}</span>
      <span className="text-[11.5px] leading-tight text-muted">{hint}</span>
    </button>
  );
}

/** What the rider kept, shown once the money is in. Never shown to a customer. */
export function EarningBreakdown({ earning, wallet, currency }) {
  if (!earning) return null;

  const unit = earning.currency || currency;

  return (
    <div className="rounded-2xl bg-sunken p-3.5">
      <dl className="space-y-1.5 text-[13px]">
        <Line label="Fare" value={formatMoney(earning.fareAmount, unit)} />
        <Line
          label={`Platform commission (${earning.platformCommissionRate}%)`}
          value={`− ${formatMoney(earning.platformCommissionAmount, unit)}`}
          muted
        />
        <div className="border-t border-hair pt-1.5">
          <Line label="You earned" value={formatMoney(earning.riderEarningAmount, unit)} strong />
        </div>
      </dl>

      {wallet && wallet.outstanding > 0 && (
        <p className="mt-2.5 border-t border-hair pt-2.5 text-[12px] leading-snug text-muted">
          Platform balance owed: <span className="tabular font-medium text-body">{formatMoney(wallet.outstanding, unit)}</span>
        </p>
      )}
    </div>
  );
}

function Line({ label, value, muted, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn('min-w-0 flex-1', muted ? 'text-faint' : 'text-muted')}>{label}</dt>
      <dd className={cn('tabular shrink-0', strong ? 'text-[15px] font-semibold text-body' : 'text-body')}>
        {value}
      </dd>
    </div>
  );
}
