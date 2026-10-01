import { useCallback, useEffect, useRef, useState } from 'react';
import * as authApi from '@/services/auth.api';

/**
 * The Google half of the auth screens, in one place.
 *
 * Two jobs: find out whether this deployment offers Google at all, and turn the
 * token Google hands back into a Raahi session. Both the login and the register
 * screen use it, which is why it is a hook rather than a prop drilled twice.
 *
 * `busy` exists so the button can say what it is doing and refuse a second
 * press. A duplicate sign-in is not merely wasteful — two requests for a brand
 * new account race each other, and although the backend resolves that race
 * correctly, the honest fix is not to start it.
 */
export function useGoogleSignIn({ onSession, role } = {}) {
  const [clientId, setClientId] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    authApi
      .providers()
      .then((data) => {
        if (alive.current) setClientId(data?.google?.configured ? data.google.clientId : null);
      })
      .catch(() => {
        // A server that cannot say means no button. The password form is
        // unaffected, and claiming Google works when we cannot ask is worse.
        if (alive.current) setClientId(null);
      })
      .finally(() => {
        if (alive.current) setChecking(false);
      });
  }, []);

  const signIn = useCallback(
    async (credential) => {
      if (busy) return;
      setBusy(true);
      setError(null);

      try {
        // The ID token and, for a brand-new account, which app they were
        // signing up for. Nothing else — no email, no name, no Google id.
        const session = await authApi.google({ idToken: credential, ...(role ? { role } : {}) });
        await onSession?.(session);
      } catch (err) {
        if (alive.current) {
          setBusy(false);
          setError(err?.message || 'That Google sign-in did not work. Please try again.');
        }
        return;
      }

      if (alive.current) setBusy(false);
    },
    [busy, onSession, role]
  );

  /**
   * Google's own failures, which are mostly the person changing their mind.
   *
   * A closed popup is not an error worth a red banner, so it is reported the
   * same way as any other non-completion: quietly, with the form still there.
   */
  const fail = useCallback((err) => {
    setBusy(false);
    setError(err?.message || 'Google sign-in was not completed.');
  }, []);

  return {
    /** Null when this deployment has no Google configured. */
    clientId,
    checking,
    busy,
    error,
    clearError: () => setError(null),
    signIn,
    fail
  };
}
