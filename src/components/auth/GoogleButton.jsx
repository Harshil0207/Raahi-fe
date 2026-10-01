import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/misc';

/**
 * Continue with Google.
 *
 * GOOGLE RENDERS ITS OWN BUTTON, and that is deliberate rather than lazy.
 * Google Identity Services has no supported way to start an ID-token sign-in
 * from a button of our own — `renderButton` is the path, and it is also the one
 * that satisfies Google's branding requirements without anybody eyeballing a
 * logo. What is styled here is the space it sits in: the same width, the same
 * corner radius and the same vertical rhythm as the Raahi buttons above it, and
 * the theme follows the app's rather than the operating system's.
 *
 * Everything this component produces is a signed token from Google. It never
 * sends an email address or a name anywhere; the backend reads those from the
 * token after checking Google's signature.
 *
 * THREE STATES THAT ARE NOT THE SAME THING, and are not shown as if they were:
 *   - not configured: the server has no client id, so there is no button at all
 *   - unreachable: Google's script did not load, so the button cannot appear
 *   - working: Google's button, ready
 */
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Whether the app is currently dark, so Google's button matches.
 *
 * Read off the `dark` class on `<html>`, which is where `useAppearance` puts
 * the answer after reconciling the saved preference with the OS. Watching the
 * element means this is right however the theme was decided and updates when it
 * changes, without this component knowing anything about settings.
 */
function useIsDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains('dark'));
    read();

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

/** One load for the page, shared by the login and register screens. */
let scriptPromise = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);

  scriptPromise =
    scriptPromise ||
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      const script = existing || document.createElement('script');

      script.addEventListener('load', () => resolve(window.google));
      script.addEventListener('error', () => {
        // Let a later attempt try again rather than caching the failure
        // forever — a phone that was on a dead connection may not be now.
        scriptPromise = null;
        reject(new Error('unreachable'));
      });

      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    });

  return scriptPromise;
}

export function GoogleButton({ clientId, onCredential, onError, disabled = false, label = 'signin_with' }) {
  const holder = useRef(null);
  const containerId = useId();
  const [state, setState] = useState('loading');
  const dark = useIsDark();

  /**
   * The callbacks, held in refs and updated in an effect.
   *
   * Google's client is initialised once with a callback it keeps; putting the
   * current handlers behind refs means a re-render (a theme change, a parent
   * update) does not have to tear that down and rebuild it, and the callback
   * Google holds never goes stale. Writing to a ref during render is what the
   * React compiler rightly objects to, so it happens after commit.
   */
  const handler = useRef(onCredential);
  const failed = useRef(onError);

  useEffect(() => {
    handler.current = onCredential;
    failed.current = onError;
  }, [onCredential, onError]);

  const render = useCallback(async () => {
    if (!clientId || !holder.current) return;

    try {
      const google = await loadGoogleScript();

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) handler.current?.(response.credential);
          else failed.current?.(new Error('Google did not return a sign-in token.'));
        },
        // One Tap is not used: it appears without being asked for and its
        // dismissal states are indistinguishable from a failure.
        auto_select: false,
        cancel_on_tap_outside: true
      });

      holder.current.innerHTML = '';
      google.accounts.id.renderButton(holder.current, {
        type: 'standard',
        theme: dark ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'pill',
        text: label,
        logo_alignment: 'center',
        width: Math.min(Math.round(holder.current.offsetWidth) || 320, 400)
      });

      setState('ready');
    } catch {
      setState('unreachable');
    }
  }, [clientId, dark, label]);

  useEffect(() => {
    render();
  }, [render]);

  // No client id means this deployment does not offer Google at all. Showing a
  // dead button would be worse than showing nothing.
  if (!clientId) return null;

  if (state === 'unreachable') {
    return (
      <p className="rounded-2xl border border-hair bg-sunken px-4 py-3 text-center text-[13px] text-muted">
        Google sign-in could not be reached. Use your email and password, or try again later.
      </p>
    );
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
      {state === 'loading' && <Skeleton className="h-11 w-full rounded-full" />}
      <div
        id={containerId}
        ref={holder}
        className={`flex justify-center ${state === 'loading' ? 'hidden' : ''}`}
      />
    </div>
  );
}
