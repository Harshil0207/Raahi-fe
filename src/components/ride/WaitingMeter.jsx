import { Clock, IndianRupee } from 'lucide-react';
import { useWaitingClock, WAITING_STATE } from '@/hooks/useWaitingClock';
import { formatMoney } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * What the waiting is costing, on either side of the transaction.
 *
 * Two people are looking at this at the same time, standing next to each
 * other, and they must not see different numbers. Both read the same server
 * timestamps and count with the same correction for clock drift, so they do.
 *
 * The tone is deliberately different from the wording. To the RIDER this is
 * money they are owed for time they are giving up. To the CUSTOMER it is a
 * charge about to start, and the useful thing is how long they have left —
 * which is why the free period counts DOWN rather than up. Nobody is helped by
 * "you have been waiting 1:42".
 *
 * It stays quiet while nothing is owed: a small line during the free period,
 * and only then a visible charge. A ride where everyone was prompt should not
 * have a meter shouting on it.
 */

const COPY = {
  pickup: {
    rider: { title: 'Waiting for customer', free: 'Free waiting' },
    customer: { title: 'Your rider is waiting', free: 'Free waiting' }
  },
  payment: {
    rider: { title: 'Waiting for payment', free: 'Free payment waiting' },
    customer: { title: 'Payment pending', free: 'Free payment waiting' }
  }
};

export function WaitingMeter({ phase, serverNow, kind = 'pickup', audience = 'customer', currency = 'INR', className }) {
  const clock = useWaitingClock(phase, serverNow);
  if (!clock) return null;

  const copy = COPY[kind]?.[audience];
  if (!copy) return null;

  /**
   * A closed phase is history, and history belongs on the receipt.
   *
   * This used to keep rendering after the phase ended, which put "Payment
   * pending — waiting charge ₹2" on a ride that had been paid for and
   * completed, directly beneath a breakdown that already said so. A meter is
   * for a clock that is still running.
   */
  if (clock.state === WAITING_STATE.CLOSED) return null;

  const charging = clock.state === WAITING_STATE.CHARGING;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
        charging ? 'border-[var(--warning)] bg-[var(--warning-wash)]' : 'border-hair bg-sunken',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          charging ? 'text-[var(--warning)]' : 'text-muted'
        )}
      >
        {charging ? <IndianRupee className="size-4" /> : <Clock className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-body">{copy.title}</p>

        {/**
         * Announced politely, so somebody not watching the screen still hears
         * the free period run out — but only this line, not the whole card.
         */}
        <p className="mt-0.5 text-[12.5px] text-muted" aria-live="polite">
          {charging ? (
            <>
              <span className="tabular font-medium text-[var(--warning)]">
                {formatMoney(clock.charge, currency)}
              </span>{' '}
              so far · {formatMoney(clock.perMinute, currency)}/min
            </>
          ) : (
            <>
              {copy.free} <span className="tabular font-medium text-body">{clock.display}</span>
            </>
          )}
        </p>
      </div>

      {/* How long it has been chargeable, beside what that has cost. */}
      {charging && <span className="tabular shrink-0 text-[12.5px] text-muted">{clock.display}</span>}
    </div>
  );
}
