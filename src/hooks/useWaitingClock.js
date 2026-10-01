import { useEffect, useState } from 'react';

/**
 * A live waiting timer that counts on the SERVER's clock, not this device's.
 *
 * The problem this exists to solve: a phone whose clock is five minutes slow
 * would show five extra free minutes, and one running fast would show a charge
 * before anything was owed. Neither number is what the customer is billed —
 * the server works that out from its own timestamps — but a screen that
 * disagrees with the receipt is worse than no screen at all, because it is the
 * number the two people standing next to each other are arguing about.
 *
 * So the server sends its own current time alongside the start time, and the
 * offset between the two clocks is worked out once and applied to every tick.
 *
 * Nothing here decides what is owed. The charge shown while a phase is open is
 * the server's own running figure, advanced locally between refreshes; the
 * moment the phase closes, the stored figure replaces it.
 */

const FREE = 'free';
const CHARGING = 'charging';
const CLOSED = 'closed';

/**
 * @param phase     one phase of `ride.waiting`, or null when it has not begun
 * @param serverNow the server's clock at the moment that payload was built
 */
export function useWaitingClock(phase, serverNow) {
  /**
   * How far this device's clock is from the server's.
   *
   * Recomputed whenever a payload arrives, so a long-lived screen keeps
   * correcting for drift rather than trusting an offset measured half an hour
   * ago. Kept in state rather than a ref because it is read while rendering,
   * and a ref read during render is a value React cannot see changing.
   */
  const [skew, setSkew] = useState(0);

  useEffect(() => {
    if (!serverNow) return;
    setSkew(new Date(serverNow).getTime() - Date.now());
  }, [serverNow]);

  const open = Boolean(phase?.open);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return undefined;

    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!phase?.startedAt) return null;

  const freeSeconds = Math.max(0, (phase.freeMinutes ?? 0) * 60);

  // On a closed phase the stored elapsed time is the billed one; recomputing it
  // here would let the figure drift after the fare had been agreed and paid.
  const elapsed = open
    ? Math.max(0, Math.floor((now + skew - new Date(phase.startedAt).getTime()) / 1000))
    : phase.seconds;

  const freeLeft = Math.max(0, freeSeconds - elapsed);

  /**
   * The running charge, on the same rule the server bills by: every started
   * minute after the free period. It is shown, never sent — the server
   * computes the figure that is actually charged when the phase closes.
   */
  const chargeable = Math.max(0, elapsed - freeSeconds);
  const liveCharge = Math.ceil(chargeable / 60) * (phase.perMinute ?? 0);

  return {
    state: !open ? CLOSED : freeLeft > 0 ? FREE : CHARGING,
    open,
    elapsed,
    freeLeft,
    /** Counts the free period down, then counts the chargeable time up. */
    display: formatClock(freeLeft > 0 ? freeLeft : chargeable),
    charge: open ? liveCharge : phase.charge,
    perMinute: phase.perMinute ?? 0
  };
}

/** mm:ss, and hh:mm:ss only once it has genuinely been that long. */
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

export const WAITING_STATE = { FREE, CHARGING, CLOSED };
