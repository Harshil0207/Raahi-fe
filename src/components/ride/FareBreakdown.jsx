import { formatMoney } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * What the total is made of, once the ride is over.
 *
 * Only worth drawing when there is something to explain. A trip where nobody
 * was kept waiting has a total identical to its fare, and a breakdown that
 * reads "Trip fare ₹100 / Total ₹100" is two lines saying one thing — so it
 * renders nothing at all in that case.
 *
 * Every figure comes from the server. Nothing here adds anything up: the total
 * shown is the one the customer was charged, not a sum computed on this device
 * that could disagree with it.
 */
export function FareBreakdown({ ride, className }) {
  const waiting = ride?.waiting || {};
  const currency = ride?.currency || 'INR';

  const pickup = waiting.pickup?.charge || 0;
  const payment = waiting.payment?.charge || 0;

  // Nothing was charged for waiting, so there is nothing to break down.
  if (!pickup && !payment) return null;

  const rideFare = ride?.rideFare;
  const total = ride?.finalFare;

  const rows = [
    { label: 'Trip fare', amount: rideFare },
    pickup ? { label: 'Pickup waiting', amount: pickup, note: minutesNote(waiting.pickup) } : null,
    payment ? { label: 'Payment waiting', amount: payment, note: minutesNote(waiting.payment) } : null
  ].filter(Boolean);

  return (
    <div className={cn('rounded-2xl border border-hair bg-sunken p-3', className)}>
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[13px] text-muted">
              {row.label}
              {row.note && <span className="ml-1.5 text-[11.5px] text-faint">{row.note}</span>}
            </dt>
            <dd className="tabular text-[13px] font-medium text-body">{formatMoney(row.amount, currency)}</dd>
          </div>
        ))}

        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-hair pt-2">
          <dt className="text-[13px] font-semibold text-body">Total</dt>
          <dd className="tabular text-[14.5px] font-semibold text-body">{formatMoney(total, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * "4:05 waited · 2 min charged" — the working, in small type.
 *
 * Without it the charge looks arbitrary to anyone who counted in their head,
 * because a started minute is billed whole: someone who waited four minutes
 * and five seconds is charged for two, and this is the line that says so
 * before they ring support about it.
 */
function minutesNote(phase) {
  if (!phase?.seconds) return null;

  const minutes = Math.floor(phase.seconds / 60);
  const seconds = String(phase.seconds % 60).padStart(2, '0');

  return `${minutes}:${seconds} waited · ${phase.minutes} min charged`;
}
