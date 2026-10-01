/**
 * Who Raahi says it is, and where it lives.
 *
 * One place for every string that appears in metadata, so a brand change is a
 * change here rather than a hunt through twenty files. Nothing in this module
 * touches the DOM — it only answers questions.
 */

export const BRAND = {
  name: 'Raahi',
  tagline: 'Modern Ride. Simple Journey.',
  /** The one-line description used wherever a page does not supply its own. */
  description:
    'Raahi is a modern ride-booking platform for customers and riders. Book rides, track trips, connect with riders, and manage your journeys with a smooth mobile-first experience.',
  keywords: [
    'ride booking',
    'cab booking',
    'bike taxi',
    'auto booking',
    'car booking',
    'parcel delivery',
    'ride sharing',
    'rider app',
    'customer ride app',
    'Raahi'
  ],
  /**
   * The two theme colours, matching `--color-paper` and `--color-ink` in
   * index.css. They are duplicated here because the browser needs them in a
   * meta tag before any stylesheet has loaded.
   */
  themeColor: { light: '#ffffff', dark: '#000000' },
  /** Drawn by `scripts/brand-assets.mjs`; 1200×630, as the OG spec asks. */
  socialImage: {
    path: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Raahi — modern ride booking for bikes, autos, cars and parcels'
  }
};

/**
 * The production origin, from configuration rather than a guess.
 *
 * Absent, every absolute-URL feature switches itself off instead of emitting a
 * wrong one: no canonical, no `og:url`, no sitemap, no JSON-LD. A canonical
 * pointing at the wrong host is worse than no canonical at all — it tells a
 * crawler to attribute the page to somewhere Raahi does not live — so this
 * degrades to silence by design.
 *
 * Setting VITE_PUBLIC_SITE_URL turns all of it on with no code change.
 */
function readSiteUrl() {
  const raw = (import.meta.env?.VITE_PUBLIC_SITE_URL || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    // Only real web origins: a `file:` or `javascript:` value here would end up
    // in a canonical tag and in structured data.
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // Stored without a trailing slash so joining is unambiguous.
    return url.origin;
  } catch {
    return null;
  }
}

export const SITE_URL = readSiteUrl();

/** Whether absolute URLs can be produced at all. */
export const hasSiteUrl = SITE_URL !== null;

/**
 * An absolute URL for a path, or null when no origin is configured.
 *
 * Trailing slashes are normalised so `/login` and `/login/` cannot both be
 * emitted as canonicals for the same page. The root keeps its single slash.
 */
export function absoluteUrl(pathname) {
  if (!SITE_URL) return null;

  const path = String(pathname || '/');
  const withLeading = path.startsWith('/') ? path : `/${path}`;
  const trimmed = withLeading.length > 1 ? withLeading.replace(/\/+$/, '') : '/';

  return `${SITE_URL}${trimmed}`;
}
