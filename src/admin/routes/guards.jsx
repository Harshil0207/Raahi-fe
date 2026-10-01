import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/admin/hooks/useAuth';
import { FullPageLoader } from '@/admin/components/common/FullPageLoader';
import { NoAccess } from '@/admin/pages/NoAccess';

/**
 * Nothing renders until the stored token has been checked against the API, so a
 * stale token cannot flash the console before bouncing to sign-in.
 */
export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Checking your session" />;

  if (!isAuthenticated) {
    // Where they were going, so sign-in can send them back there.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

/**
 * A page behind a permission.
 *
 * The backend enforces the same permission; this is so an operator who follows a
 * link they cannot use gets an explanation rather than a wall of failed requests.
 */
export function RequirePermission({ permission, children }) {
  const { can } = useAuth();

  if (!can(permission)) return <NoAccess permission={permission} />;

  return children ?? <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageLoader label="Checking your session" />;
  if (isAuthenticated) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
