import { Toaster } from 'sonner';
import { AuthProvider } from '@/admin/store/AuthProvider';
import { AppRoutes } from '@/admin/routes';
import { ErrorBoundary } from '@/admin/components/common/ErrorBoundary';
import '@/admin/admin.css';

/**
 * The operations console, mounted inside the customer app at `/admin`.
 *
 * WHAT THIS REPLACED. The console used to be its own Vite build on its own
 * origin, with its own session. It is now one app, reached through a route.
 * Three things that used to be free now have to be done deliberately, and they
 * are all here:
 *
 *   1. NO `BrowserRouter`. There is exactly one router, in the customer app's
 *      `App`. A second one nested inside it would own a second history and the
 *      two would fight over the URL.
 *
 *   2. ITS OWN `AuthProvider`, which is NOT the customer one. The console signs
 *      in against `/api/v1/admin/auth`, holds a token the backend signs with a
 *      different secret, and keeps it in `sessionStorage` so closing the tab
 *      ends the shift. A customer being signed in grants nothing here, and vice
 *      versa — they are separate accounts in separate collections. Because this
 *      provider is inside the lazily-loaded subtree, it only ever runs for
 *      somebody who has actually navigated to `/admin`.
 *
 *   3. THE `admin-scope` WRAPPER, which carries the console's palette. See
 *      `admin.css`: both designs use the same variable names, so the wrapper is
 *      what decides which values apply.
 *
 * WHAT ONE ORIGIN COSTS, stated plainly because it cannot be fixed from here.
 * The console's token is now reachable by any script running on the customer
 * app's origin, which it was not when the two were separate sites. The backend
 * boundary is untouched — a customer token still cannot call an admin endpoint,
 * the admin JWT is still signed with `ADMIN_JWT_SECRET`, and every route under
 * `/api/v1/admin` still checks its permission. What changed is the browser-side
 * isolation, and the defence that replaces it is a strict Content-Security
 * Policy on the served app, so an injected script cannot run in the first
 * place. That belongs in the deployment configuration, not in this file.
 */
export default function AdminApp() {
  return (
    <div className="admin-scope">
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
          {/* The console's own toaster, bottom-right and on its own surfaces.
              The customer app's sits top-centre; both can be mounted at once
              without colliding because sonner keys them by position. */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '13px'
              }
            }}
          />
        </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}
