import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';
import { BRAND } from '../src/lib/seo/site.js';
import { INDEXABLE_ROUTES, DISALLOWED_PREFIXES } from '../src/lib/seo/routeTable.js';

/**
 * The parts of SEO a single-page app cannot do at runtime.
 *
 * Three jobs, all of them build-time because a crawler that does not run
 * JavaScript is the whole audience:
 *
 *   1. robots.txt and sitemap.xml, written from the route table rather than by
 *      hand, so a page cannot be disallowed in one and advertised in the other.
 *
 *   2. The absolute-URL tags — canonical, `og:url` and the JSON-LD block —
 *      injected into index.html, but only when an origin is configured.
 *
 *   3. A copy of index.html per public route, with that route's own title and
 *      description baked in. This is the part that matters most and the part
 *      usually missed: WhatsApp, Facebook, Twitter, LinkedIn, Slack and iMessage
 *      previewers read the served HTML and never execute a line of script, so a
 *      title set by React is invisible to them. Serving `/login/index.html` with
 *      the login title in it is what makes a shared link preview correctly.
 *
 * Static hosts pick the more specific file over the SPA fallback, so
 * `/login/index.html` is served for `/login` and the app still boots from it
 * and takes over routing. Nothing about client-side navigation changes.
 */
export function seo() {
  let origin = null;
  let isBuild = false;
  let outDir = 'dist';

  /**
   * The tags that only exist when an origin is known: the canonical, `og:url`
   * and the structured-data block. Nothing here duplicates a tag index.html
   * already ships — the image tags are rewritten in place instead, below.
   */
  const absoluteTags = (pathname) => {
    if (!origin) return '';

    const url = pathname === '/' ? `${origin}/` : `${origin}${pathname}`;

    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          url: `${origin}/`,
          name: BRAND.name,
          description: BRAND.description,
          publisher: { '@id': `${origin}/#organization` }
        },
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: BRAND.name,
          url: `${origin}/`,
          description: BRAND.description,
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/icon-512.png`,
            width: 512,
            height: 512
          }
        }
      ]
    };

    return [
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:url" content="${url}" />`,
      // The id matters: it is the handle `lib/seo/meta.js` uses to find this
      // block. Without it the runtime could not see the one the build wrote, so
      // it added a second on public pages and left this one in place on private
      // ones — a wallet screen serving the site's structured data.
      `<script type="application/ld+json" id="raahi-structured-data">${JSON.stringify(graph)}</script>`
    ].join('\n    ');
  };

  /**
   * Make the two social image references absolute.
   *
   * index.html ships them relative so the file is correct with no configuration,
   * but several previewers will not resolve a relative `og:image` against the
   * page — they want a full URL or they show no picture. Rewritten in place
   * rather than added, so there is still exactly one of each.
   */
  const absoluteImages = (html) => {
    if (!origin) return html;
    const image = `${origin}${BRAND.socialImage.path}`;
    return setMeta(
      setMeta(html, /<meta\s+property="og:image"[^>]*>/, image),
      /<meta\s+name="twitter:image"[^>]*>/,
      image
    );
  };

  /** Swap a tag's content in a finished HTML string, leaving the rest alone. */
  const setTitle = (html, title) =>
    html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

  const setMeta = (html, matcher, content) =>
    html.replace(matcher, (tag) =>
      tag.replace(/content="[^"]*"/, `content="${escapeHtml(content)}"`)
    );

  return {
    name: 'raahi-seo',

    configResolved(config) {
      isBuild = config.command === 'build';
      outDir = path.resolve(config.root, config.build.outDir);
      // Read through Vite's own loader so a value in .env, .env.production or
      // the shell all behave the same way.
      const env = loadEnv(config.mode, config.envDir || process.cwd(), 'VITE_');
      const raw = (env.VITE_PUBLIC_SITE_URL || '').trim();

      if (!raw) {
        config.logger.warn(
          '[seo] VITE_PUBLIC_SITE_URL is not set, so no canonical URLs, no og:url,\n' +
            '      no structured data and no sitemap.xml will be produced. robots.txt is\n' +
            '      still written. Set it to the production origin to switch these on.'
        );
        return;
      }

      try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('not web');
        origin = url.origin;
      } catch {
        config.logger.error(
          `[seo] VITE_PUBLIC_SITE_URL is not a usable origin: ${JSON.stringify(raw)}.\n` +
            '      Ignoring it rather than emitting a wrong canonical URL.'
        );
      }
    },

    /** The absolute-URL tags go into the one index.html, for both dev and build. */
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const withImages = absoluteImages(html);
        const tags = absoluteTags('/');
        if (!tags) return withImages;
        return withImages.replace('</head>', `  ${tags}\n  </head>`);
      }
    },

    /**
     * In dev there is no dist to serve from, so the two generated files are
     * served by hand. Without this, they only exist after a build, and "does
     * robots.txt work" cannot be answered until deploy time.
     */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];

        if (url === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(robotsTxt(origin));
          return;
        }
        if (url === '/sitemap.xml') {
          if (!origin) {
            res.statusCode = 404;
            res.end('sitemap.xml needs VITE_PUBLIC_SITE_URL\n');
            return;
          }
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(sitemapXml(origin));
          return;
        }
        next();
      });
    },

    /**
     * Written after the build, from the finished output on disk.
     *
     * Not `generateBundle`: Vite does not put index.html through Rollup's bundle
     * in every version — in Vite 8 it is nowhere in that object — so reading the
     * emitted file is the approach that does not depend on which version is
     * installed. It also guarantees the copies are made from the *final* HTML,
     * hashed asset names and all.
     */
    closeBundle() {
      if (!isBuild) return;

      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'robots.txt'), robotsTxt(origin));

      if (origin) fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml(origin));

      const indexPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        this.warn(`no index.html at ${indexPath}, so no per-route HTML was written`);
        return;
      }

      const index = fs.readFileSync(indexPath, 'utf8');
      const written = [];

      for (const route of INDEXABLE_ROUTES) {
        const { path: routePath, title, description } = route;
        let html = index;

        html = setTitle(html, title);
        html = setMeta(html, /<meta\s+name="description"[^>]*>/, description);
        html = setMeta(html, /<meta\s+property="og:title"[^>]*>/, title);
        html = setMeta(html, /<meta\s+property="og:description"[^>]*>/, description);
        html = setMeta(html, /<meta\s+name="twitter:title"[^>]*>/, title);
        html = setMeta(html, /<meta\s+name="twitter:description"[^>]*>/, description);

        if (origin) {
          const url = `${origin}${routePath}`;
          html = html.replace(
            /<link\s+rel="canonical"[^>]*>/,
            `<link rel="canonical" href="${url}" />`
          );
          html = setMeta(html, /<meta\s+property="og:url"[^>]*>/, url);
        }

        // `/login` → `login/index.html`, which is the file a static host serves
        // for a request to /login, in preference to the SPA fallback.
        const dir = path.join(outDir, routePath.replace(/^\//, ''));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
        written.push(`${routePath} → ${path.relative(outDir, path.join(dir, 'index.html'))}`);
      }

      const lines = [
        'robots.txt',
        origin ? 'sitemap.xml' : 'sitemap.xml skipped (no VITE_PUBLIC_SITE_URL)',
        ...written
      ];
      console.log(`\nseo: ${lines.join(', ')}`);
    }
  };
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * robots.txt.
 *
 * Written even without an origin, because the disallow list does not need one —
 * only the sitemap reference does, and a `Sitemap:` line pointing at the wrong
 * host is worse than its absence.
 *
 * Note what is NOT disallowed: `/`. Blocking it would stop a crawler fetching
 * the customer home at all, and a page a crawler cannot fetch is a page whose
 * `noindex` tag it can never read — which is how a URL ends up listed with no
 * description instead of being properly excluded. The private screens are kept
 * out by their tags; robots.txt only spares crawlers the walk.
 */
function robotsTxt(origin) {
  const lines = [
    '# Raahi',
    '# Private screens are also served with `noindex, nofollow`; this file only',
    '# saves a crawler the trip. See src/lib/seo/routeTable.js for the source.',
    '',
    'User-agent: *',
    'Allow: /',
    ''
  ];

  for (const prefix of DISALLOWED_PREFIXES) lines.push(`Disallow: ${prefix}`);

  if (origin) {
    lines.push('', `Sitemap: ${origin}/sitemap.xml`);
  } else {
    lines.push('', '# No Sitemap line: VITE_PUBLIC_SITE_URL was not set at build time.');
  }

  return `${lines.join('\n')}\n`;
}

/** The sitemap: the public routes, and nothing else. */
function sitemapXml(origin) {
  const entries = INDEXABLE_ROUTES.map(
    ({ path }) => `  <url>\n    <loc>${origin}${path}</loc>\n  </url>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}
