import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { seo } from './plugins/seo.js';

export default defineConfig({
  plugins: [react(), tailwindcss(), seo()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@shared': path.resolve(import.meta.dirname, '../shared'),

      /**
       * `shared/` has no `node_modules` of its own, and Node resolves a bare
       * import by walking up from the FILE, not from the app importing it. So
       * `clsx` inside shared/ looks in `shared/node_modules` and the repo root,
       * finds neither, and the build fails. These point its four npm imports at
       * this app's copy. Adding an npm import to shared/ means adding a line.
       */
      clsx: path.resolve(import.meta.dirname, 'node_modules/clsx'),
      'tailwind-merge': path.resolve(import.meta.dirname, 'node_modules/tailwind-merge'),
      'lucide-react': path.resolve(import.meta.dirname, 'node_modules/lucide-react'),
      react: path.resolve(import.meta.dirname, 'node_modules/react')
    }
  },
  /**
   * `@shared` reaches the folder beside this app.
   *
   * Six files live there because they were byte-identical in both apps and had
   * already drifted once. They are imported, not copied, so there is nothing
   * left to keep in sync.
   *
   * `fs.allow` is needed because the dev server refuses to serve files outside
   * the project root by default, and `shared/` is deliberately outside it.
   */
  server: {
    fs: { allow: ['..'] },
    // The backend pins CORS and the socket handshake to FRONTEND_URL, which is
    // http://localhost:3000 by default. Running anywhere else gets rejected.
    port: 3000,
    strictPort: true
  },
  build: {
    // Leaflet stays out of the entry chunk on its own: MapView is imported
    // lazily by MapShell, so auth and history screens never download it.
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        /**
         * Group the libraries into a handful of chunks, by what changes together.
         *
         * WHY THIS EXISTS: splitting the animation engine out of the entry
         * bundle halved it, and then made the page slower. Rollup had scattered
         * the engine across a dozen four-kilobyte files, taking the script count
         * from 33 to 62 — and on a throttled connection thirty extra round trips
         * cost far more than the bytes they saved. Same bytes, worse page.
         *
         * So the split is kept and the fragments are gathered. Four groups, by
         * how often they change rather than by what imports them, because that
         * is also what makes them cache well: React and the router move on their
         * own schedule, the animation engine on another, the interface
         * primitives on a third.
         *
         * Anything not named here is left alone — route chunks in particular,
         * which are split by the lazy imports in the route table and are the
         * reason a customer never downloads the rider's screens.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          /**
           * NOT framer-motion, and this one was expensive to find.
           *
           * Naming it here made things WORSE in a way that reads as an
           * improvement: a named chunk full of framer-motion looks like a
           * clean split, but rolldown then treats that chunk as a static
           * dependency of the entry and emits a modulepreload for it — even
           * though every one of the twenty-six components that import the
           * library is lazily loaded behind a route. So the landing page
           * downloaded 40 KB of animation engine, of which Lighthouse measured
           * 25 KB as unused, before it painted the login form.
           *
           * Ungrouped, rolldown puts the library in one shared chunk that the
           * route chunks needing it import for themselves — one chunk, not
           * twenty-six copies, and nothing on the first paint's critical path.
           * Measured on the landing page: entry graph 251 KB -> 211 KB
           * gzipped, Performance 85 -> 91, LCP 3.34s -> 2.91s, TBT 172ms ->
           * 91ms.
           *
           * The same reasoning does NOT apply to GSAP below: that one is a
           * genuine static dependency of the opening animation and the auth
           * entrance, so it is on the critical path either way, and grouping it
           * is what stops it fragmenting into a dozen files.
           */
          /**
           * NOT lucide-react, and not Radix.
           *
           * Grouping the icons here was a mistake worth recording: the app uses
           * something like eighty-five of them across every screen, and naming
           * the package pulled all eighty-five into a chunk the first page load
           * fetches. Left ungrouped, each icon travels in the route chunk of the
           * screen that actually uses it, which is what the lazy route table is
           * for. Radix is the same — a dialog belongs to the screen with a
           * dialog on it.
           *
           * What stays are the few that genuinely are shared by everything:
           * the class-name helpers every component calls, and the toaster, which
           * is mounted for the whole session.
           */
          if (/[\\/]node_modules[\\/](sonner|class-variance-authority|tailwind-merge|clsx)[\\/]/.test(id)) {
            return 'vendor-ui';
          }
          if (/[\\/]node_modules[\\/](gsap|@gsap)[\\/]/.test(id)) return 'vendor-gsap';

          return undefined;
        }
      }
    }
  }
});
