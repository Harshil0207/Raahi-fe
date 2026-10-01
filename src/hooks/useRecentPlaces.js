import { useCallback, useEffect, useState } from 'react';

/**
 * Places this person has picked before, kept in the browser.
 *
 * Separate from `useRecentDestinations`, which reads completed rides from the
 * server: that one is the record of trips actually taken, this one is the record
 * of what they last chose. A destination picked at 9pm and then cancelled is not
 * a trip, but it is exactly what they are most likely to pick again at 9.05,
 * so the picker wants this list.
 *
 * Pickup and destination are kept apart. A pickup is usually where you are; a
 * destination is usually where you are not, and mixing them makes both lists
 * worse.
 *
 * What is stored is the minimum that lets the place be re-selected: address,
 * coordinates, the provider's id, and when it was last used. No name, no phone,
 * no ride id, nothing about who went there or why.
 */

const VERSION = 1;
const STORED = 8;

/**
 * Keyed per account, because a browser is often shared. Without this, signing
 * out and back in as someone else would show them the previous person's
 * addresses, which is a worse privacy failure than keeping the id.
 */
const keyFor = (kind, userId) => `raahi.recent.${kind}.${userId || 'anon'}`;

/**
 * Whether two entries are the same place.
 *
 * Coordinates decide it, rounded to about eleven metres — close enough that two
 * picks of the same doorway collapse, far enough apart that two shops on one
 * street do not. A matching address counts too, since the same place geocoded
 * on different days can land a few metres apart.
 *
 * The provider's id is deliberately not used. It is stored so the place can be
 * re-selected, but a provider that hands out a placeholder id for every result
 * would quietly collapse the whole list into one entry.
 */
const coordKey = (place) => `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
const addressKey = (place) => (place.address || '').trim().toLowerCase();

const samePlace = (a, b) => coordKey(a) === coordKey(b) || addressKey(a) === addressKey(b);

const isUsable = (place) =>
  Boolean(place) &&
  typeof place.address === 'string' &&
  place.address.trim().length > 0 &&
  Number.isFinite(place.lat) &&
  Number.isFinite(place.lng);

/** Only the fields needed to pick the place again. */
const strip = (place) => ({
  address: place.address.trim(),
  placeId: place.placeId || undefined,
  lat: place.lat,
  lng: place.lng,
  at: Date.now()
});

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    // A store written by an older version is dropped rather than guessed at.
    if (!parsed || parsed.v !== VERSION || !Array.isArray(parsed.items)) return [];

    return parsed.items.filter(isUsable).sort((a, b) => (b.at || 0) - (a.at || 0));
  } catch {
    // Private browsing, blocked storage, or something else wrote nonsense here.
    // An empty history is a fine outcome; a crashed picker is not.
    return [];
  }
}

function write(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: VERSION, items }));
  } catch {
    // Quota or blocked storage. The list still works for this session.
  }
}

/** Newest first, one entry per place, capped. */
function merge(existing, place) {
  const without = existing.filter((item) => !samePlace(item, place));
  return [strip(place), ...without].slice(0, STORED);
}

/**
 * @param kind  'destination' or 'pickup'
 * @param max   how many to hand back for display
 */
export function useRecentPlaces(kind, { max = 5, userId } = {}) {
  const key = keyFor(kind, userId);
  const [items, setItems] = useState(() => read(key));

  // Switching account swaps the list rather than merging two people's history.
  useEffect(() => {
    setItems(read(key));
  }, [key]);

  const remember = useCallback(
    (place) => {
      if (!isUsable(place)) return;

      setItems((current) => {
        const next = merge(current, place);
        write(key, next);
        return next;
      });
    },
    [key]
  );

  const forget = useCallback(
    (place) => {
      setItems((current) => {
        const next = current.filter((item) => !samePlace(item, place));
        write(key, next);
        return next;
      });
    },
    [key]
  );

  /**
   * Fills an empty list from somewhere else — for destinations, the completed
   * rides the server already knows about — so a returning customer on a new
   * browser is not shown "No recent destinations" when they have a year of
   * trips. Only ever adds to an empty store, so it cannot reorder a list the
   * person has been building by using the app.
   */
  const seed = useCallback(
    (places) => {
      if (!Array.isArray(places) || !places.length) return;

      setItems((current) => {
        if (current.length) return current;

        const seeded = [];
        for (const place of places) {
          if (!isUsable(place)) continue;
          if (seeded.some((item) => samePlace(item, place))) continue;

          seeded.push({
            ...strip(place),
            // Keep the real time where there is one, so the order is honest.
            at: place.lastUsedAt ? new Date(place.lastUsedAt).getTime() : Date.now()
          });

          if (seeded.length === STORED) break;
        }

        if (!seeded.length) return current;

        const ordered = seeded.sort((a, b) => b.at - a.at);
        write(key, ordered);
        return ordered;
      });
    },
    [key]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to do; the state below is what the UI reads.
    }
    setItems([]);
  }, [key]);

  return { recents: items.slice(0, max), remember, forget, seed, clear };
}
