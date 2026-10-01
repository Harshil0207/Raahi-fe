import { useEffect, useState } from 'react';
import * as settingsApi from '@/services/settings.api';

/**
 * The platform configuration the apps are allowed to know, fetched once.
 *
 * Shared rather than per-screen because several screens need the same answers
 * and none of them should hardcode one. The pickup-code length is the case that
 * made this necessary: it is an admin setting between 4 and 6, and the rider
 * screen drew four boxes and refused to submit anything else — so raising the
 * setting would have left riders unable to enter a code at all.
 *
 * Cached at module scope for the life of the tab. These values change about as
 * often as someone edits them in the console, and every screen re-fetching them
 * on mount is a request per navigation for no benefit. A reload picks up a
 * change, which is the right granularity for configuration.
 */
let cache = null;
let inFlight = null;
const subscribers = new Set();

/**
 * Whether the fetch has finished, successfully or not.
 *
 * WHY A SECOND FLAG. `settings === null` meant two different things — "not back
 * yet" and "the request failed" — and a caller could not tell them apart. That
 * is fine for a screen with a fallback value, but not for one reserving space:
 * a placeholder shown while null would sit there for ever if the request
 * failed. `settled` is what makes "give up on it" expressible.
 */
let settled = false;

function load() {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = settingsApi
    .publicSettings()
    .then((data) => {
      cache = data;
      settled = true;
      inFlight = null;
      for (const notify of subscribers) notify(data);
      return data;
    })
    .catch((err) => {
      // Not fatal: every caller has a sane fallback, and a screen that cannot
      // reach settings is usually a screen that cannot reach anything. The
      // subscribers are still told, so anything holding space for a value can
      // stop holding it.
      settled = true;
      inFlight = null;
      for (const notify of subscribers) notify(null);
      throw err;
    });

  return inFlight;
}

/**
 * The settings, plus whether the answer has arrived.
 *
 * For callers that need to reserve layout space: a section that appears once
 * this resolves pushes everything below it down, which is a layout shift a
 * person sees and Lighthouse scores. Knowing the request is still in flight is
 * what lets a screen hold the space instead.
 */
export function usePlatformSettingsState() {
  const [state, setState] = useState(() => ({ settings: cache, settled }));

  useEffect(() => {
    if (cache) {
      setState({ settings: cache, settled: true });
      return undefined;
    }

    let alive = true;
    const notify = (data) => {
      if (alive) setState({ settings: data, settled: true });
    };

    subscribers.add(notify);
    load().catch(() => {});

    return () => {
      alive = false;
      subscribers.delete(notify);
    };
  }, []);

  return state;
}

/** Just the values, for the screens that have a fallback and need nothing more. */
export function usePlatformSettings() {
  return usePlatformSettingsState().settings;
}

/** Forgets the cache. For tests and for a sign-out that changes nothing else. */
export const clearPlatformSettings = () => {
  cache = null;
  settled = false;
};
