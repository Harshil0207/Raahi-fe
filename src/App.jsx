import { lazy, Suspense, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { IntroAnimation } from '@/components/intro/IntroAnimation';
import { RouteSeo } from '@/components/common/Seo';
import { RouteProgress } from '@/components/loading/RouteProgress';
import { GlassFilters } from '@/components/ui/glass';
import { AppRoutes } from '@/routes';
import { useAppearance } from '@/hooks/useAppearance';

/**
 * The offline banner, and the socket client behind it, loaded only once there
 * is a session to lose.
 *
 * It was imported eagerly, which looked free — it is thirty lines and renders
 * nothing most of the time. But it reads the socket's connection state, so it
 * pulled `socket.io-client` and `engine.io-client` into the entry chunk: 46 KB
 * of raw JavaScript, measured, on the critical path of a login screen that has
 * no socket and cannot have one, because the handshake needs a token nobody
 * signed out has.
 *
 * The authentication check moved out of the component and up to the render
 * below, so that nothing is imported until it is true.
 */
const ConnectionBanner = lazy(() =>
  import('@/components/common/ConnectionBanner').then((m) => ({ default: m.ConnectionBanner }))
);

/**
 * The theme is settled by the inline script in index.html, before the first
 * paint. Doing it in an effect here meant a visible flash of the wrong theme on
 * every load.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          {/* One shared set of refraction filters for every glass surface. */}
          <GlassFilters />
          <Shell />
          {/* Sonner's own palette ignores the theme, so a success toast landed
              as a bright light-green block on a black screen. These use the
              app's surfaces, with the status colour carried by the icon and
              the border rather than a filled background. */}
          <Toaster
            position="top-center"
            closeButton
            toastOptions={{
              className: 'rounded-2xl',
              style: {
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                boxShadow: 'var(--shadow-float)'
              }
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

/**
 * Inside the provider, so the opening can be told when the app is actually
 * ready rather than guessing with a timer.
 *
 * `restoring` is the difference between "signed out" and "we do not know yet",
 * which is exactly the question the startup screen is covering: it is there so
 * nobody sees the login screen for a frame before their session comes back.
 *
 * The routes are mounted the whole time, underneath. The cover is a cover, not
 * a gate — so the app is warming up while it is on screen and is interactive
 * the moment it lifts.
 */
function Shell() {
  // Applies the person's theme, motion, text size and contrast to the document.
  // Mounted once here rather than per screen: it writes to <html>, and two
  // copies would fight over the same attributes.
  useAppearance();

  const { restoring, isAuthenticated } = useAuth();
  const [opened, setOpened] = useState(false);

  return (
    <>
      {!opened && <IntroAnimation ready={!restoring} onDone={() => setOpened(true)} />}
      {/* `fallback={null}`: a banner that says the connection dropped has
          nothing useful to show while its own code is arriving. */}
      {isAuthenticated && (
        <Suspense fallback={null}>
          <ConnectionBanner />
        </Suspense>
      )}
      {/* Before the routes, so a page that declares its own metadata applies
          after this one and therefore wins. */}
      <RouteSeo />
      <AppRoutes />
      {/* Shows only while a screen's code is still arriving, and only once
          that has taken long enough to be worth saying. Under the opening
          cover, which already reports its own wait. */}
      <RouteProgress />
    </>
  );
}
