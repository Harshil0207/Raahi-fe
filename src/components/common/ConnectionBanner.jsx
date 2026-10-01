import { WifiOff } from 'lucide-react';
import { useSocketStatus } from '@/hooks/useSocket';

/**
 * Real-time updates stop when the socket drops, so say so rather than leaving a
 * stale screen that looks live.
 *
 * CSS rather than framer-motion, and the reason is measurable: this component
 * is mounted on every page load, including the login screen, so importing an
 * animation library here put it in front of the first paint of every visit —
 * for a banner most people never see. One keyframe does the same slide.
 *
 * Mount/unmount is kept rather than held open with a class, because the status
 * region has to be inserted to be announced. The trade is the exit slide: the
 * banner arrives with a slide when the connection drops and simply goes when it
 * comes back. The arrival is the moment that matters.
 *
 * It no longer checks whether anybody is signed in. `App` does that before it
 * imports this file at all, which is what keeps the socket client out of the
 * login screen's critical path — an `isAuthenticated` test inside a module
 * cannot stop that module being downloaded.
 */
export function ConnectionBanner() {
  const connected = useSocketStatus();

  if (connected) return null;

  return (
    <div
      role="status"
      className="drop-in fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-[var(--warning)] px-4 py-1.5 text-xs font-medium text-[var(--background)]"
    >
      <WifiOff className="size-3.5" aria-hidden />
      Reconnecting — live updates are paused
    </div>
  );
}
