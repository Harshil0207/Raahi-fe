import { useCallback, useSyncExternalStore } from 'react';
import { useSetting } from '@/hooks/useUserSettings';

/**
 * A media query is external state, so it is read through useSyncExternalStore
 * rather than mirrored into React state — no effect, no extra render on mount.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// Matches the `md` breakpoint, where the layout switches to map + side panel.
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');

/** What the device asks for, ignoring anything the person set in the app. */
export const useSystemReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/**
 * Whether to play a non-essential animation.
 *
 * Reads the person's own setting first and falls back to the device. It is
 * written into this hook rather than offered as a second one because seventeen
 * components already call this, and a preference that only applied to the few
 * somebody remembered to update would be a switch that mostly does nothing.
 *
 * Before settings load — a cold start, the intro animation, a signed-out page —
 * `useSetting` returns the mirrored choice from the last session, so the app
 * does not animate at somebody who asked it not to while it waits on a fetch.
 */
export function usePrefersReducedMotion() {
  const system = useSystemReducedMotion();
  const choice = useSetting('accessibility.reducedMotion', readMotionMirror());

  return choice === 'system' ? system : choice === 'on';
}

function readMotionMirror() {
  try {
    return localStorage.getItem('raahi.reducedMotion') || 'system';
  } catch {
    return 'system';
  }
}
