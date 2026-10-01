/**
 * Writing metadata into the document, exactly once each.
 *
 * WHY THIS IS IMPERATIVE RATHER THAN RENDERED. React 19 can hoist a `<title>`
 * or `<meta>` rendered anywhere in the tree up into `<head>`, which is tidier
 * to write — but it *appends*. `index.html` already ships a full set of tags so
 * that crawlers which do not run JavaScript still get correct information, and
 * appending to that set produces two `<meta name="description">` elements and
 * two titles. A crawler handed two descriptions picks one, and it is not
 * necessarily the right one.
 *
 * So this finds the existing element and updates it, creating one only when
 * none exists and removing it when a page has nothing to say. The result is
 * that the served HTML and the live DOM hold the same single set of tags, which
 * is the property that makes the output checkable.
 */

/** `<meta name="...">` — the ordinary kind. */
const named = (name) => ({
  selector: `meta[name="${name}"]`,
  create: () => {
    const el = document.createElement('meta');
    el.setAttribute('name', name);
    return el;
  },
  write: (el, value) => el.setAttribute('content', value)
});

/** `<meta property="...">` — Open Graph uses `property`, not `name`. */
const property = (prop) => ({
  selector: `meta[property="${prop}"]`,
  create: () => {
    const el = document.createElement('meta');
    el.setAttribute('property', prop);
    return el;
  },
  write: (el, value) => el.setAttribute('content', value)
});

/** `<link rel="canonical">`. */
const linkRel = (rel) => ({
  selector: `link[rel="${rel}"]`,
  create: () => {
    const el = document.createElement('link');
    el.setAttribute('rel', rel);
    return el;
  },
  write: (el, value) => el.setAttribute('href', value)
});

/**
 * Every key this module is allowed to manage.
 *
 * A closed list matters: it is what lets the function remove a tag a previous
 * page set. Navigating from a public page to a private one has to clear the
 * canonical and the Open Graph block, not leave them pointing at the last
 * public page.
 */
const FIELDS = {
  description: named('description'),
  keywords: named('keywords'),
  robots: named('robots'),
  canonical: linkRel('canonical'),

  'og:type': property('og:type'),
  'og:site_name': property('og:site_name'),
  'og:title': property('og:title'),
  'og:description': property('og:description'),
  'og:url': property('og:url'),
  'og:image': property('og:image'),
  'og:image:width': property('og:image:width'),
  'og:image:height': property('og:image:height'),
  'og:image:alt': property('og:image:alt'),

  'twitter:card': named('twitter:card'),
  'twitter:title': named('twitter:title'),
  'twitter:description': named('twitter:description'),
  'twitter:image': named('twitter:image'),
  'twitter:image:alt': named('twitter:image:alt')
};

/**
 * Apply a set of tags. `title` is handled separately because it is an element
 * with text, not an attribute; any key whose value is null or undefined has its
 * element removed.
 */
export function applyMeta({ title, ...fields }) {
  if (typeof document === 'undefined') return;

  if (title) document.title = title;

  for (const [key, spec] of Object.entries(FIELDS)) {
    const value = fields[key];
    const existing = document.head.querySelector(spec.selector);

    if (value === null || value === undefined || value === '') {
      if (existing) existing.remove();
      continue;
    }

    const el = existing || spec.create();
    spec.write(el, String(value));
    if (!existing) document.head.appendChild(el);
  }
}

/**
 * The JSON-LD block, kept to a single script element.
 *
 * Given null, the block is removed — a private page should carry no structured
 * data at all, and a stale block left behind from the previous page would
 * describe the wrong thing.
 */
const LD_ID = 'raahi-structured-data';

export function applyStructuredData(data) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById(LD_ID);

  if (!data) {
    if (existing) existing.remove();
    return;
  }

  const el = existing || document.createElement('script');
  if (!existing) {
    el.type = 'application/ld+json';
    el.id = LD_ID;
  }
  el.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(el);
}
