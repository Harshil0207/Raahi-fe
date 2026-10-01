import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND, absoluteUrl, hasSiteUrl } from '@/lib/seo/site';
import { seoForPath } from '@/lib/seo/routes';
import { applyMeta, applyStructuredData } from '@/lib/seo/meta';

/**
 * Raahi as a search engine should understand it.
 *
 * Only real, checkable facts: the name, the site, the logo, the description.
 * No ratings, no review counts, no prices, no addresses, no social profiles —
 * structured data that claims things the application cannot back up is worse
 * than none, because it is the kind of claim a search engine penalises.
 *
 * Returns null when no origin is configured, since `url` and `logo` are the
 * fields that make this block mean anything.
 */
function organisationGraph() {
  if (!hasSiteUrl) return null;

  const site = absoluteUrl('/');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${site}#website`,
        url: site,
        name: BRAND.name,
        description: BRAND.description,
        publisher: { '@id': `${site}#organization` }
      },
      {
        '@type': 'Organization',
        '@id': `${site}#organization`,
        name: BRAND.name,
        url: site,
        description: BRAND.description,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl('/icon-512.png'),
          width: 512,
          height: 512
        }
      }
    ]
  };
}

/**
 * The metadata for one screen.
 *
 * Every route already has an entry in `lib/seo/routes.js`, and this reads it —
 * so a page gets correct metadata whether or not anyone remembered to think
 * about that page. The props are for the cases the table cannot know: a title
 * that depends on loaded data, say. They override; they are never required.
 *
 *   <Seo title="Trip to Bandra | Raahi" />
 *   <Seo noIndex />
 *
 * The work runs in a layout effect so the title changes in the same frame the
 * screen does, rather than a beat later.
 */
export function Seo({ title, description, image, noIndex, canonicalPath }) {
  const { pathname } = useLocation();

  const route = seoForPath(pathname);

  // Props win over the table, and `noIndex` is one-way: a page may take itself
  // out of the index, never put itself in. Indexability is decided in one
  // place, on purpose.
  const indexable = route.indexable && noIndex !== true;

  const resolvedTitle = title || route.title;
  const resolvedDescription = description || route.description;
  const resolvedCanonical = indexable ? canonicalPath || route.canonicalPath || pathname : null;
  const canonical = resolvedCanonical ? absoluteUrl(resolvedCanonical) : null;

  useLayoutEffect(() => {
    /**
     * A private screen carries a title, a description and `noindex` — and no
     * canonical, Open Graph or Twitter tags. There is nothing to preview about
     * somebody's wallet, and a preview card is a small leak of whose it is.
     */
    if (!indexable) {
      applyMeta({
        title: resolvedTitle,
        description: resolvedDescription,
        keywords: null,
        robots: 'noindex, nofollow',
        canonical: null,
        'og:type': null,
        'og:site_name': null,
        'og:title': null,
        'og:description': null,
        'og:url': null,
        'og:image': null,
        'og:image:width': null,
        'og:image:height': null,
        'og:image:alt': null,
        'twitter:card': null,
        'twitter:title': null,
        'twitter:description': null,
        'twitter:image': null,
        'twitter:image:alt': null
      });
      applyStructuredData(null);
      return;
    }

    const social = image || route.image;
    const socialUrl = absoluteUrl(social) || social;

    applyMeta({
      title: resolvedTitle,
      description: resolvedDescription,
      keywords: BRAND.keywords.join(', '),
      robots: 'index, follow',
      canonical,

      'og:type': 'website',
      'og:site_name': BRAND.name,
      'og:title': resolvedTitle,
      'og:description': resolvedDescription,
      'og:url': canonical,
      'og:image': socialUrl,
      'og:image:width': BRAND.socialImage.width,
      'og:image:height': BRAND.socialImage.height,
      'og:image:alt': BRAND.socialImage.alt,

      'twitter:card': 'summary_large_image',
      'twitter:title': resolvedTitle,
      'twitter:description': resolvedDescription,
      'twitter:image': socialUrl,
      'twitter:image:alt': BRAND.socialImage.alt
    });

    applyStructuredData(organisationGraph());
  }, [indexable, resolvedTitle, resolvedDescription, canonical, image, route.image]);

  return null;
}

/**
 * Mounted once, beside the router.
 *
 * Every navigation re-runs it, so each screen's metadata is correct without
 * twenty pages each remembering to declare it — and a screen added later is
 * covered on the day it is added. A page that needs something specific still
 * renders its own `<Seo>`; the last one to apply wins, which is the page.
 */
export function RouteSeo() {
  return <Seo />;
}
