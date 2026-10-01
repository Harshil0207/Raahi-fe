import { useEffect, useRef, useState } from 'react';

/**
 * Counts down to a server-supplied deadline rather than running its own timer.
 *
 * The backend writes `expiresAt` when it creates a ride request and checks that
 * stored value on accept, so a client clock that drifts, a tab that was
 * backgrounded, or an offer restored after a reload all resolve correctly —
 * the UI simply reflects what the server already decided.
 */
export function useCountdown(expiresAt, { totalMs, onExpire } = {}) {
  const deadline = expiresAt ? new Date(expiresAt).getTime() : null;

  const [remaining, setRemaining] = useState(() =>
    deadline ? Math.max(deadline - Date.now(), 0) : 0
  );

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!deadline) return;

    let fired = false;

    const tick = () => {
      const left = Math.max(deadline - Date.now(), 0);
      setRemaining(left);

      if (left === 0 && !fired) {
        fired = true;
        onExpireRef.current?.();
      }
    };

    // 100ms keeps the ring visibly smooth without being a render treadmill.
    const id = setInterval(tick, 100);
    tick();

    return () => clearInterval(id);
  }, [deadline]);

  const span = totalMs || 20000;

  return {
    remainingMs: remaining,
    seconds: Math.ceil(remaining / 1000),
    progress: Math.min(Math.max(remaining / span, 0), 1),
    expired: deadline != null && remaining === 0
  };
}
