import { matchPath } from 'react-router-dom';
import { BRAND } from './site';
import { ROUTE_SEO, FALLBACK_SEO } from './routeTable';

export { INDEXABLE_ROUTES, DISALLOWED_PREFIXES } from './routeTable';

/**
 * Most specific pattern first.
 *
 * Depth alone is not enough. `/support/new` and `/support/:complaintId` are
 * both three segments deep, and sorting the tie alphabetically put the
 * parameter first — so `/support/new` was matched as a complaint id and got the
 * wrong title. A literal segment is always more specific than a parameter, so
 * the number of parameters breaks the tie before the name does.
 */
const paramCount = (path) => (path.match(/:/g) || []).length;

const BY_SPECIFICITY = [...ROUTE_SEO].sort(
  (a, b) =>
    b.path.split('/').length - a.path.split('/').length ||
    paramCount(a.path) - paramCount(b.path) ||
    a.path.localeCompare(b.path)
);

/**
 * The metadata for a pathname.
 *
 * `matchPath` is react-router's own matcher — the very one the router uses — so
 * this cannot disagree with the routing table about what `/rides/abc` is, and
 * no second routing system is introduced to find out.
 */
export function seoForPath(pathname) {
  const route =
    BY_SPECIFICITY.find((r) => matchPath({ path: r.path, end: true }, pathname)) || FALLBACK_SEO;

  return {
    title: route.title,
    description: route.description ?? null,
    indexable: route.indexable === true,
    // A canonical only ever points at the pattern's own fixed path. A ride's id
    // is not something to publish, and no indexable route carries a parameter.
    canonicalPath: route.indexable === true ? route.path : null,
    image: route.image ?? BRAND.socialImage.path
  };
}
