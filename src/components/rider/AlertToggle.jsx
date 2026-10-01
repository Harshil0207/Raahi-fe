import { Bell, BellOff, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sound on or off for incoming work, and the prompt to allow it.
 *
 * Three states, because there are genuinely three. Off is the rider's choice.
 * On means sound will play. Waiting means they want it and the browser has not
 * seen a gesture yet — a real condition that a two-state switch would have to
 * lie about, and the lie matters: a rider who believes alerts are on will put
 * the phone in their pocket.
 *
 * Small and quiet on purpose. It lives on the driving screen next to the map
 * controls, where it can be found when wanted and ignored the rest of the time.
 */
export function AlertToggle({ on, needsGesture, onToggle, className }) {
  /**
   * The accessible name CONTAINS the visible text, which is why the waiting
   * state reads "Enable alerts for ride requests" rather than "Enable ride
   * alerts". The pill shows "Enable alerts"; a name that rephrased it meant
   * somebody using voice control could not say what they could see, and axe
   * flags exactly that mismatch.
   */
  const label = needsGesture
    ? 'Enable alerts for ride requests'
    : on
      ? 'Ride alerts on — turn off'
      : 'Ride alerts off — turn on';

  const Icon = needsGesture ? BellRing : on ? Bell : BellOff;

  return (
    <button
      type="button"
      // Not a switch: in the waiting state this is a request for permission
      // rather than a toggle, and announcing it as "off" would be wrong.
      aria-label={label}
      title={label}
      onClick={() => onToggle(!on)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12.5px] font-medium',
        'transition-colors duration-150 ease-[var(--ease-out-soft)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        // The waiting state is the only one that asks for anything, so it is
        // the only one that draws attention.
        needsGesture
          ? 'border-[var(--warning-edge)] bg-[var(--warning-wash)] text-body'
          : 'border-hair bg-elevated text-muted hover:text-body',
        className
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {needsGesture ? <span>Enable alerts</span> : <span className="sr-only">{label}</span>}
    </button>
  );
}
