import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '@/services/auth.api';
import {
  getAccessToken,
  mayHaveSession,
  onUnauthenticated,
  rememberSession,
  setAccessToken
} from '@/services/api';
import { AuthContext } from './auth-context';
import { clearUserSettings, primeUserSettings } from '@/hooks/useUserSettings';

/**
 * The real-time connection, fetched when there is a session rather than when
 * this file loads.
 *
 * `socket.io-client` and `engine.io-client` are 46 KB of raw JavaScript, and a
 * static import here put all of it in the entry chunk — downloaded before the
 * login screen painted, by somebody who has no token and therefore cannot open
 * a socket at all. Both uses below are events, not rendering: a session being
 * established, and one ending. Neither is on a path where waiting a moment for
 * a module is visible.
 *
 * Failures are swallowed on purpose. If the chunk cannot be fetched the app is
 * still usable over plain HTTP — it loses live updates, which is the same
 * degraded state a dropped socket already produces and which the connection
 * banner already reports.
 */
const socketModule = () => import('@/socket/socket');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [rider, setRider] = useState(null);
  // `restoring` is the difference between "signed out" and "we don't know yet".
  // Guards must wait for it, or a refresh bounces the user to /login.
  const [restoring, setRestoring] = useState(true);

  const applySession = useCallback((session) => {
    if (session.accessToken) setAccessToken(session.accessToken);
    setUser(session.user);
    setRider(session.rider ?? null);
    socketModule().then((m) => m.connectSocket()).catch(() => {});
    // The settings fetch is skipped while signed out, so this is what starts
    // it. Ordered after the token is set, because that is what it checks.
    primeUserSettings();
  }, []);

  const clearSession = useCallback(() => {
    // Signed out for good: stop probing on every future load.
    rememberSession(false);
    setAccessToken(null);
    setUser(null);
    setRider(null);
    socketModule().then((m) => m.disconnectSocket()).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        // A stored access token is tried first; if it has expired, the axios
        // interceptor refreshes it from the httpOnly cookie. If there is no
        // token at all, the cookie alone can still revive the session.
        if (!getAccessToken()) {
          /*
           * Only probe the cookie if this browser has ever had a session.
           *
           * A first-time visitor has no refresh cookie, so this call could
           * only ever 401 — one wasted round trip on the critical path of the
           * login and public pages, plus a console error that Lighthouse
           * counts against Best Practices. Anyone who has signed in here
           * before still gets their session restored exactly as before.
           */
          if (!mayHaveSession()) throw new Error('no session to restore');
          await authApi.refresh().then((d) => setAccessToken(d.accessToken));
        }

        const session = await authApi.me();
        if (!cancelled) applySession(session);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  // Fired when a refresh fails mid-session, so the app drops to signed-out
  // rather than looping on 401s.
  useEffect(() => {
    onUnauthenticated(() => clearSession());
    return () => onUnauthenticated(null);
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const session = await authApi.login(credentials);
      applySession(session);
      return session;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const session = await authApi.register(payload);
      applySession(session);
      return session;
    },
    [applySession]
  );

  /**
   * A Google sign-in that has already been exchanged for a session.
   *
   * Takes the session rather than the token, because the hook that talks to
   * Google owns that exchange. What happens here is identical to `login`: the
   * same tokens, the same socket, the same state. There is deliberately no
   * second session mechanism for Google users.
   */
  const applyGoogleSession = useCallback(
    async (session) => {
      applySession(session);
      return session;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Revoking server-side is best effort; the local session goes either way.
    }
    clearSession();
    // Otherwise the next person to sign in on this device inherits the last
    // one's theme, notification switches and map preferences.
    clearUserSettings();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      rider,
      setRider,
      restoring,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      login,
      register,
      applyGoogleSession,
      logout,
      refreshUser: () => authApi.me().then(applySession)
    }),
    [user, rider, restoring, login, register, applyGoogleSession, logout, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
