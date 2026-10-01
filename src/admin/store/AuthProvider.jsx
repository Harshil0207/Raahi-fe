import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '@/admin/services/auth.api';
import { getToken, onSessionChange } from '@/admin/services/api';
import { closeSocket } from '@/admin/socket/socket';
import { AdminAuthContext } from './auth-context';

/**
 * Who is signed in, and what they may do.
 *
 * The permission list comes from the backend with the admin, rather than being
 * derived from the role in the browser. That way a role's permissions can change
 * server-side without shipping a new console, and the console and the API can
 * never disagree about what a role means.
 */
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // A token in sessionStorage is a claim, not proof: it is checked against the
  // API before the console renders anything behind the guard.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    authApi
      .me()
      .then((result) => !cancelled && setAdmin(result))
      .catch(() => {
        // The interceptor has already cleared an expired token.
        if (!cancelled) setAdmin(null);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  // When the interceptor drops the token on a 401, the session ends here too,
  // so a stale screen cannot keep rendering as though someone is signed in.
  useEffect(
    () =>
      onSessionChange((token) => {
        if (!token) {
          closeSocket();
          setAdmin(null);
        }
      }),
    []
  );

  const signIn = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    setAdmin(result);
    return result;
  }, []);

  const signOut = useCallback(() => {
    authApi.logout();
    closeSocket();
    setAdmin(null);
  }, []);

  const value = useMemo(() => {
    const held = new Set(admin?.permissions || []);

    return {
      admin,
      loading,
      signIn,
      signOut,
      setAdmin,
      isAuthenticated: Boolean(admin),
      /** True when the signed-in admin holds every listed permission. */
      can: (...required) => required.every((permission) => held.has(permission)),
      /** True when they hold at least one — for a nav section with several pages. */
      canAny: (...required) => required.some((permission) => held.has(permission))
    };
  }, [admin, loading, signIn, signOut]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
