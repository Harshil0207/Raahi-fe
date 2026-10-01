import { lazy } from 'react';

/**
 * Whether a route's code is still on its way.
 *
 * WHY THIS EXISTS. Routes are code-split, so moving to a screen for the first
 * time waits on a network request. React Router wraps navigations in
 * `startTransition`, which means React deliberately keeps the CURRENT page on
 * screen instead of dropping to the Suspense fallback — good, because a flash
 * of empty layout on every tap is worse than a short wait. The cost is that on
 * a slow connection nothing at all indicates the tap registered: the loading
 * animation exists, and nobody ever sees it.
 *
 * So the pending state is tracked here instead, around the import itself, and
 * a small indicator reads it. This is the only thing that knows a chunk is in
 * flight — React will not tell us, and the router has no navigation state to
 * ask because the app uses a plain BrowserRouter rather than a data router.
 */

let pending = 0;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn());

export function subscribeToPending(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const isPending = () => pending > 0;

/**
 * A lazily loaded route that reports while it is loading.
 *
 * Counted rather than flagged: two chunks can be in flight at once — a route
 * and the map inside it — and a plain boolean would go false when the first
 * one landed, hiding the indicator while the screen was still waiting.
 *
 * The count is decremented on failure as well. A chunk that fails to load
 * throws into the error boundary, and an indicator left spinning for ever
 * underneath it would be the last thing anybody needed.
 */
export function route(load) {
  return lazy(() => {
    pending += 1;
    notify();

    return load().finally(() => {
      pending -= 1;
      notify();
    });
  });
}
