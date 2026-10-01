import { useEffect, useState } from 'react';
import { BottomSheet, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils';

/**
 * Cancelling a ride, with a reason and an honest warning about the cost.
 *
 * One sheet for both apps. The reasons come from the server rather than from a
 * list in here, so the two sides stay in step and an operator can change the
 * wording without a release — and the two lists genuinely differ: a customer
 * has no use for "customer unreachable".
 *
 * ABOUT THE FEE. The figure shown is what the rules WOULD charge, taken from
 * public settings. It is a warning, not an invoice: what is actually charged is
 * worked out on the server from the ride's own timestamps, and the cancelled
 * ride comes back carrying it. So the sheet says "may be charged" and never
 * states a total as though it had already been decided — a screen that promises
 * a number the server then disagrees with is worse than a screen that promises
 * nothing.
 */
export function CancelSheet({ open, onOpenChange, side, ride, onConfirm, busy }) {
  const settings = usePlatformSettings();
  const [reasonCode, setReasonCode] = useState(null);
  const [note, setNote] = useState('');

  // A fresh sheet each time it opens: an abandoned "changed my mind" should not
  // be sitting there pre-selected the next time somebody opens this.
  useEffect(() => {
    if (open) {
      setReasonCode(null);
      setNote('');
    }
  }, [open]);

  const reasons = settings?.cancellation?.reasons?.[side] || {};
  const codes = Object.keys(reasons);

  const fee = side === 'rider' ? settings?.cancellation?.riderFee : settings?.cancellation?.customerFee;
  const currency = settings?.currency || '';

  /**
   * Whether to warn about money at all.
   *
   * Only once a rider is actually on the job: before that nothing is charged
   * whatever the settings say, and a fee warning on a ride nobody has accepted
   * would be a threat the server would not carry out. The free window is not
   * counted down here — the server owns that clock — so a cancellation a few
   * seconds inside it can show a warning and then cost nothing, which is the
   * right way round for a warning to be wrong.
   */
  const mayCost = Boolean(ride?.riderId) && Number(fee) > 0;

  /**
   * The free window in words, or nothing at all.
   *
   * An operator can set it to zero, and "cancellations within the first 0
   * seconds are free" is not a sentence — so at zero the clause is dropped
   * rather than printed with a useless number in it.
   */
  const freeWindow = describeWindow(settings?.cancellation?.freeWindowSeconds);

  const needsNote = reasonCode === 'other';
  const canSubmit = Boolean(reasonCode) && (!needsNote || note.trim().length > 0);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} label="Cancel this ride?">
      <div className="space-y-4 p-5 pb-safe">
        <SheetTitle className="text-lg font-semibold text-body">Cancel this ride?</SheetTitle>

        <p className="text-sm text-muted">
          {ride?.riderId
            ? side === 'rider'
              ? 'The customer is expecting you. Cancelling sends them back to searching.'
              : 'Your rider is already on the way. Cancelling now frees them for another trip.'
            : 'We will stop looking for a rider.'}
        </p>

        {mayCost && (
          <p
            role="note"
            className="rounded-lg border border-[var(--warning-edge)] bg-[var(--warning-wash)] px-3 py-2 text-sm text-body"
          >
            Cancelling now may cost {currency} {Number(fee).toFixed(2)}.
            {freeWindow ? ` Cancellations within ${freeWindow} of a rider accepting are free.` : ''}
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-body">Why are you cancelling?</legend>

          {codes.map((code) => (
            <label
              key={code}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
                reasonCode === code
                  ? 'border-[var(--accent)] bg-[var(--accent-wash)] text-body'
                  : 'border-hair text-muted hover:bg-[var(--surface-sunken)]'
              )}
            >
              <input
                type="radio"
                name="cancel-reason"
                value={code}
                checked={reasonCode === code}
                onChange={() => setReasonCode(code)}
                className="accent-[var(--accent)]"
              />
              {reasons[code]}
            </label>
          ))}
        </fieldset>

        {needsNote && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            aria-label="What happened?"
            placeholder="What happened?"
            className="w-full rounded-lg border border-hair bg-surface px-3 py-2 text-sm text-body placeholder:text-muted focus:border-[var(--accent)] focus:outline-none"
          />
        )}

        <div className="flex gap-2">
          <Button variant="outline" block onClick={() => onOpenChange(false)}>
            Keep ride
          </Button>
          <Button
            variant="danger"
            block
            loading={busy}
            disabled={!canSubmit}
            onClick={() => onConfirm({ reasonCode, note: note.trim() || undefined })}
          >
            Cancel ride
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

function describeWindow(seconds) {
  const value = Number(seconds) || 0;
  if (value <= 0) return null;
  if (value < 60) return `${value} seconds`;

  const minutes = Math.round(value / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}
