import { RiderLoader } from '@/components/loading/RiderLoader';
import { cn } from '@/lib/utils';

/**
 * What fills the content area while a page's code is still arriving.
 *
 * Deliberately NOT full-screen. It is absolutely positioned inside `<main>`,
 * which means the tab bar — a sibling of `<main>`, fixed and on a higher layer
 * — stays visible and usable throughout. That is the whole point: an earlier
 * arrangement put a full-page loader above the router, so every lazy page load
 * replaced the entire shell and the tab bar blinked out and back.
 *
 * It also does not announce itself on a fast load, because on a warm cache
 * nothing suspends and this never mounts. No artificial hold, no minimum
 * display time: if the page is ready, the page is what you see.
 *
 * The scene inside is the bike, at its compact size — the same waiting state
 * the opening screen shows, so a cold start and a page change are recognisably
 * the same app doing the same thing.
 *
 * The fade is a keyframe rather than framer-motion. This is imported by the
 * route table and by the guards, so it is on every first paint — an animation
 * library loaded ahead of the login screen for one 180ms opacity change. The
 * `.fade-in` class drops itself under reduced motion, which is what the hook
 * used to do here.
 */
export function PageLoader({ label = 'Loading', className }) {
  return (
    <div
      // `absolute`, so it covers the page area and nothing else. z-20 sits under
      // the tab bar's z-40 by design — see the layering note in AppLayout.
      className={cn(
        'fade-in absolute inset-0 z-20 grid place-items-center backdrop-blur-sm',
        // An explicit mix rather than an opacity modifier on `.bg-app`. That
        // utility is hand-written, so Tailwind has no colour to apply a
        // modifier to and drops the class silently — this cover was fully
        // opaque while the code claimed otherwise. `npm run check:tokens`
        // exists to catch exactly that, and it does not read comments kindly,
        // so the broken form is described here rather than quoted.
        'bg-[color-mix(in_oklab,var(--background)_82%,transparent)]',
        className
      )}
    >
      {/* RiderLoader carries the live region, so this wrapper stays silent —
          two nested status roles would be announced twice. */}
      <RiderLoader size="sm" label={label} entrance={false} />
    </div>
  );
}
