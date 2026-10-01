import { useCallback, useEffect, useState } from 'react';
import * as settingsApi from '@/services/userSettings.api';
import { getAccessToken } from '@/services/api';

/**
 * The signed-in person's own preferences, fetched once and shared.
 *
 * Module-scope rather than per-screen, because these are read all over the app
 * — the theme on every page, reduced motion by every animation, the map's
 * follow behaviour while a trip is running — and a Context would mean every one
 * of those re-renders when any single setting changes. This is the same shape
 * `usePlatformSettings` already uses, with two things added that a read-only
 * cache does not need: writing, and reverting a write that failed.
 *
 * SAVING IS OPTIMISTIC, AND HONEST ABOUT IT. A toggle moves the moment it is
 * tapped, because waiting on a round-trip makes a switch feel broken. If the
 * request then fails the value goes back to what it was and the caller is told,
 * so what is on screen always matches what the server holds. It never reports
 * "Saved" for something that was not.
 */

let cache = null;
let inFlight = null;
const subscribers = new Set();

const notify = () => {
  for (const fn of subscribers) fn(cache);
};

function load() {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  /*
   * Nobody is signed in, so there are no personal settings to fetch.
   *
   * This hook is mounted by `useAppearance` for the whole app, which meant
   * every visit to the login, register or public pages fired this request,
   * got a 401, and had the axios interceptor spend a second round trip on a
   * refresh that could not succeed either. Two wasted requests before the
   * first paint, on exactly the pages where the first paint matters most —
   * and a console full of 401s, which is a Best Practices failure on top.
   *
   * `null` rather than a rejection: not being signed in is not an error, and
   * every reader of this already falls back to the shipped default while the
   * real values are unknown.
   */
  if (!getAccessToken()) return Promise.resolve(null);

  inFlight = settingsApi
    .getSettings()
    .then((data) => {
      cache = data;
      inFlight = null;
      notify();
      return data;
    })
    .catch((err) => {
      inFlight = null;
      throw err;
    });

  return inFlight;
}

/** Replaces the cached values without waiting for the server. */
function applyLocally(patch) {
  if (!cache) return;

  cache = {
    ...cache,
    values: { ...cache.values, ...patch },
    groups: cache.groups.map((group) => ({
      ...group,
      settings: group.settings.map((setting) =>
        setting.key in patch ? { ...setting, value: patch[setting.key] } : setting
      )
    }))
  };

  notify();
}

/**
 * Saves one group's worth of changes.
 *
 * Returns nothing and throws nothing — the outcome is the `error` it resolves
 * to, because every caller here is an event handler and an unhandled rejection
 * in one of those is a silent failure. On failure the previous values are put
 * back before the caller is told, so a toast and the control can never disagree.
 */
async function save(group, patch) {
  const before = Object.fromEntries(Object.keys(patch).map((key) => [key, cache?.values?.[key]]));

  applyLocally(patch);

  try {
    const fresh = await settingsApi.updateSettings(group, patch);
    // The server's answer wins: it is the one that knows what was stored, and
    // it may have coerced a value on the way in.
    cache = fresh;
    notify();
    return { ok: true };
  } catch (err) {
    applyLocally(before);
    return { ok: false, error: err };
  }
}

export function useUserSettings() {
  const [settings, setSettings] = useState(cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    const listen = (data) => setSettings(data);
    subscribers.add(listen);

    if (cache) setSettings(cache);
    else load().catch(setError);

    return () => {
      subscribers.delete(listen);
    };
  }, []);

  const update = useCallback((group, patch) => save(group, patch), []);

  return {
    settings,
    values: settings?.values || null,
    groups: settings?.groups || [],
    mandatoryNotifications: settings?.mandatoryNotifications || [],
    // Distinguishes "not fetched yet" from "fetched and empty", so a screen can
    // show its skeleton rather than a page of defaults that might be wrong.
    loaded: Boolean(settings),
    error,
    update,
    reload: () => {
      cache = null;
      return load().catch(setError);
    }
  };
}

/**
 * One setting, for the many places that need a single answer.
 *
 * Takes a fallback because these are read on screens that render before the
 * fetch lands — the map asking whether to follow the rider cannot wait, and the
 * right answer while we do not know is the shipped default.
 */
export function useSetting(key, fallback) {
  const { values } = useUserSettings();
  return values?.[key] ?? fallback;
}

/**
 * Fetches the settings now that somebody is signed in.
 *
 * The pair to `clearUserSettings`. Without it, the skipped fetch above would
 * stay skipped for the rest of the session: the hook only loads on mount, and
 * `useAppearance` mounted long before the sign-in happened.
 */
export function primeUserSettings() {
  if (cache || !getAccessToken()) return;
  load().catch(() => {
    // A failure here is not worth interrupting a sign-in for; every reader
    // falls back to the shipped default and the settings screen retries.
  });
}

/** Forgets the cache. For sign-out, so the next person does not inherit these. */
export function clearUserSettings() {
  cache = null;
  inFlight = null;
  notify();
}
