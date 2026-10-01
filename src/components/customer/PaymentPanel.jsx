import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, CheckCircle2, QrCode, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import * as paymentApi from '@/services/payment.api';
import { formatMoney } from '@/utils/format';
import { IN_FLIGHT_PAYMENT, PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/ride';

/**
 * What the customer is told about paying, and the one thing they can do.
 *
 * WHO CHOOSES THE METHOD. Still the rider. They are standing there, they know
 * whether a note changed hands, and this screen offering Cash as well meant two
 * people answering one question with the last tap winning.
 *
 * WHAT CHANGED. A redirect gateway needs the payer's own device: PhonePe hands
 * back a URL that has to open where the customer is, and the rider cannot tap
 * it for them. So there is exactly one action here — paying online, when that
 * is the method the rider selected. It does not choose anything; it opens the
 * checkout for the fare already agreed.
 *
 * Everything else is still a report. Whether the money arrived comes from the
 * gateway by way of our own backend, never from this screen, and never from
 * the customer having returned from a payment page.
 *
 * Nothing here shows the platform's cut or what the rider owes. The customer
 * paid a fare; the accounting behind it is not theirs to see.
 */
export function PaymentPanel({ rideId, payment, amount, currency, provider, onChanged }) {
  const method = payment?.method;
  const status = payment?.status ?? PAYMENT_STATUS.PENDING;
  const paid = status === PAYMENT_STATUS.PAID;
  const failed = status === PAYMENT_STATUS.FAILED;
  const waiting = IN_FLIGHT_PAYMENT.includes(status);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // While a payment is in flight, keep asking the server to re-check with the
  // provider. The answer comes from the gateway, never from this screen.
  const check = useCallback(async () => {
    try {
      await paymentApi.getPaymentStatus(rideId);
      if (alive.current) onChanged?.();
    } catch {
      // A failed poll is a network blip, not a failed payment.
    }
  }, [rideId, onChanged]);

  useEffect(() => {
    if (!waiting) return undefined;
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, [waiting, check]);

  const [starting, setStarting] = useState(false);

  /**
   * Opens the gateway's checkout.
   *
   * Guarded against a second tap, because two taps against a redirect gateway
   * is how a customer ends up with two open orders and pays the one nobody is
   * polling. The backend reuses an open attempt anyway; this stops the request
   * being made at all.
   *
   * If the customer already has an open checkout — they came back without
   * paying, or reloaded — the same URL is reopened rather than a new order.
   */
  const pay = useCallback(async () => {
    if (starting) return;
    setStarting(true);

    try {
      const existing = payment?.checkoutUrl;
      const result = existing ? { checkout: { url: existing } } : await paymentApi.startCheckout(rideId);

      if (!result?.checkout?.url) throw new Error('The payment page could not be opened');

      // Same tab. A gateway redirect that opens in a new one loses the return
      // trip on most mobile browsers, and the customer ends up on a checkout
      // with no way back into the app.
      window.location.assign(result.checkout.url);
    } catch (err) {
      if (alive.current) {
        setStarting(false);
        toast.error(err?.message || 'The payment could not be started. Please try again.');
      }
    }
  }, [starting, payment, rideId]);

  const canPayOnline = method === PAYMENT_METHOD.UPI && !paid && provider?.online !== false;

  if (paid) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        className="flex items-center gap-3 rounded-2xl border border-[var(--success-edge)] bg-[var(--success-wash)] p-4"
      >
        <CheckCircle2 className="size-6 shrink-0 text-[var(--success)]" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-body">Payment received</p>
          <p className="text-xs text-muted">
            {amount != null ? `${formatMoney(amount, currency)} · ` : ''}
            {method === PAYMENT_METHOD.UPI ? 'Paid online' : 'Paid in cash'}
          </p>
        </div>
      </motion.div>
    );
  }

  if (failed) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger-edge)] bg-[var(--danger-wash)] p-4">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[var(--danger)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-body">That payment did not go through</p>
          <p className="text-xs leading-snug text-muted">
            {payment?.failureReason || 'Your rider can take the fare another way.'}
          </p>

          {canPayOnline && (
            <Button size="sm" className="mt-3" loading={starting} onClick={pay}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // A code is up and the money has not landed. This is the only state where the
  // customer has something to do.
  if (waiting && method === PAYMENT_METHOD.UPI) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border border-[var(--warning-edge)] bg-[var(--warning-wash)] p-4"
        aria-live="polite"
      >
        <Spinner className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-body">
            {payment?.checkoutUrl ? 'Finish your payment' : 'Scan your rider’s code'}
            {amount != null ? ` · ${formatMoney(amount, currency)}` : ''}
          </p>
          <p className="text-xs leading-snug text-muted">
            {payment?.checkoutUrl
              ? 'Your payment is being confirmed. This updates by itself.'
              : 'This updates by itself once the payment goes through.'}
          </p>

          {/* The way back to a checkout somebody left without finishing. */}
          {payment?.checkoutUrl && (
            <Button variant="outline" size="sm" className="mt-3" loading={starting} onClick={pay}>
              Open the payment page
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-sunken p-4" aria-live="polite">
      {method === PAYMENT_METHOD.UPI ? (
        <QrCode className="mt-0.5 size-5 shrink-0 text-body" aria-hidden />
      ) : (
        <Banknote className="mt-0.5 size-5 shrink-0 text-body" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-body">
          {amount != null ? formatMoney(amount, currency) : 'Fare due'}
          {method === PAYMENT_METHOD.CASH ? ' in cash' : method === PAYMENT_METHOD.UPI ? ' online' : ''}
        </p>
        <p className="text-xs leading-snug text-muted">
          {method === PAYMENT_METHOD.CASH
            ? 'Hand the fare to your rider — they confirm it in their app and this updates automatically.'
            : method === PAYMENT_METHOD.UPI
              ? 'Pay online now, or scan the code your rider shows you.'
              : 'Your rider will settle this with you at the drop-off.'}
        </p>

        {canPayOnline && (
          <Button className="mt-3" block loading={starting} onClick={pay}>
            {starting ? 'Opening payment…' : `Pay ${amount != null ? formatMoney(amount, currency) : 'now'}`}
          </Button>
        )}
      </div>
    </div>
  );
}
