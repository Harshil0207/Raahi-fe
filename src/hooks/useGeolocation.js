import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser geolocation, with the states that actually happen: not supported,
 * permission denied, position unavailable, timeout. Nothing here can turn a
 * device's GPS on — the browser asks, the user decides.
 */

const STATUS = {
  IDLE: 'idle',
  PROMPTING: 'prompting',
  GRANTED: 'granted',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  /**
   * The page is not on a secure origin, so the browser will never ask.
   *
   * Its own category because it is the one case that looks exactly like a bug:
   * `'geolocation' in navigator` is true, `getCurrentPosition` can be called,
   * and then nothing happens — no prompt, sometimes not even an error. It is
   * also the commonest way to hit this, because it is what testing on a phone
   * over `http://192.168.x.x` does. Naming it means the app can say what is
   * wrong instead of showing "share your location" to someone who cannot.
   */
  INSECURE: 'insecure'
};

const MESSAGES = {
  1: 'Location permission was denied. Allow it for this site in your browser, then try again.',
  2: 'Your location is unavailable right now. Try again, or set the pickup point on the map.',
  3: 'Finding your location took too long. Try again, or set the pickup point on the map.'
};

const INSECURE_MESSAGE =
  'Browsers only share location over a secure connection. Open the app on localhost or over https and it will ask again.';

/**
 * Whether this page can ask for location at all.
 *
 * `localhost` and `127.0.0.1` count as secure, which is why it works on a
 * development machine and then silently stops working the moment the same build
 * is opened from another device on the network.
 */
const canAsk = () => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location?.hostname || '';
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};

const toPosition = (p) => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracy: p.coords.accuracy ?? undefined,
  heading: Number.isFinite(p.coords.heading) ? p.coords.heading : undefined,
  speed: Number.isFinite(p.coords.speed) && p.coords.speed >= 0 ? p.coords.speed : undefined,
  at: p.timestamp
});

/** Whether two fixes are the same spot as far as anything on screen cares. */
const samePlace = (a, b) =>
  Boolean(a) &&
  a.lat.toFixed(5) === b.lat.toFixed(5) &&
  a.lng.toFixed(5) === b.lng.toFixed(5) &&
  // Heading is drawn as a rotation, so a turn on the spot still matters.
  Math.round(a.heading ?? -1) === Math.round(b.heading ?? -1);

/**
 * @param resumeIfAllowed  Fetch a position on mount, but ONLY if the browser
 *   has already been given permission — so a returning customer's map still
 *   centres itself without being asked again, and a first-time visitor is not
 *   met by a permission prompt they did not ask for. That unsolicited prompt
 *   was a real cost as well as an audit failure: a permission request left
 *   pending on navigation also disqualifies the page from the back/forward
 *   cache, so leaving and returning reloaded the whole app.
 *
 *   Where the Permissions API is missing, there is no way to know without
 *   asking, so this falls back to the old behaviour rather than leaving those
 *   browsers with a map that never finds anyone.
 */
export function useGeolocation({ watch = false, enabled = true, resumeIfAllowed = false } = {}) {
  const hasApi = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const secure = hasApi && canAsk();
  // "Supported" has to mean "can actually produce a position", not "the
  // function exists" — otherwise an insecure origin reads as supported and the
  // UI invites an action that can never succeed.
  const supported = hasApi && secure;

  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState(() => {
    if (!hasApi) return STATUS.UNAVAILABLE;
    if (!secure) return STATUS.INSECURE;
    return STATUS.IDLE;
  });
  const [error, setError] = useState(() => (hasApi && !secure ? INSECURE_MESSAGE : null));

  /**
   * Whether anybody has actually asked for a position yet.
   *
   * A `watchPosition` on a permission nobody has granted raises the browser's
   * prompt on its own, which is how the rider's screen came to ask for location
   * the moment it opened — while the rider was still offline and had no use for
   * it. Set by `request()`, so a tap is enough.
   */
  const [touched, setTouched] = useState(false);

  const watchIdRef = useRef(null);
  // Mirrors `status` so the permission listener can read it without being a
  // dependency of its own effect, and without deciding inside a state updater.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleError = useCallback((err) => {
    setError(MESSAGES[err.code] || 'Could not determine your location.');
    setStatus(err.code === 1 ? STATUS.DENIED : STATUS.UNAVAILABLE);
  }, []);

  /**
   * A fix only becomes new state if it says something different.
   *
   * `watchPosition` fires about once a second whether or not the device has
   * moved, and each fix used to become a fresh object — so every screen holding
   * this hook re-rendered at 1Hz even with the phone on a table. On the rider's
   * active-ride screen that re-ran the map's fit, panning it continuously
   * behind the sheet while the rider was trying to type a pickup code.
   *
   * Five decimal places is about a metre, which is finer than a phone GPS is
   * honest about and far finer than anything the UI draws.
   */
  const handleSuccess = useCallback((p) => {
    const next = toPosition(p);

    setPosition((current) => (samePlace(current, next) ? current : next));
    setStatus(STATUS.GRANTED);
    setError(null);
  }, []);

  const request = useCallback(() => {
    if (!hasApi) {
      setStatus(STATUS.UNAVAILABLE);
      setError('This browser cannot share your location.');
      return;
    }

    if (!secure) {
      // Calling through would do nothing observable, which is the behaviour
      // that reads as "the app is broken". Say the real reason instead.
      setStatus(STATUS.INSECURE);
      setError(INSECURE_MESSAGE);
      return;
    }

    // Somebody asked for this, so a watch may now start of its own accord.
    setTouched(true);
    setStatus(STATUS.PROMPTING);
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 15000
    });
  }, [hasApi, secure, handleSuccess, handleError]);

  // Reads the permission without triggering a prompt, so the UI can show the
  // right thing before the user is asked anything.
  const [permission, setPermission] = useState(null);
  /**
   * Bumped only when a denial is lifted.
   *
   * The watch effect depends on it, so the stream restarts by itself the
   * moment the rider allows location in site settings — no tap, no reload.
   * A plain `permission` dependency would also restart it while a prompt was
   * still open on screen, which is why this only counts the recovery.
   */
  const [recoveries, setRecoveries] = useState(0);

  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return;

    let active = true;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!active) return;

        const apply = (state, initial) => {
          setPermission(state);

          if (state === 'denied') {
            setStatus(STATUS.DENIED);
            return;
          }

          /**
           * The permission stopped being a denial, so stop saying it is.
           *
           * This is the recovery path. Without it, a rider who followed the
           * instructions — opened site settings, switched location to Allow —
           * came back to an app still insisting it was blocked, because the
           * first failed fix had latched DENIED and nothing ever cleared it.
           * Only a reload helped, which is a poor thing to have to know.
           *
           * The initial read is excluded: at that point 'prompt' is simply the
           * starting state and there is nothing to recover from.
           */
          if (!initial && statusRef.current === STATUS.DENIED) {
            statusRef.current = STATUS.IDLE;
            setStatus(STATUS.IDLE);
            setError(null);
            setRecoveries((n) => n + 1);
          }
        };

        apply(result.state, true);
        result.onchange = () => apply(result.state, false);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [supported]);

  /**
   * The resume, once — and only once the permission is actually known.
   *
   * `asked` is a ref rather than state because this must not re-run when the
   * permission object changes for any other reason; the point is a single
   * silent fix for somebody who has already said yes.
   */
  const asked = useRef(false);
  useEffect(() => {
    if (!resumeIfAllowed || asked.current || !supported) return;

    const noPermissionsApi = !navigator.permissions?.query;
    if (permission === 'granted' || noPermissionsApi) {
      asked.current = true;
      request();
    }
  }, [resumeIfAllowed, supported, permission, request]);

  useEffect(() => {
    /**
     * The stream waits for permission, or for somebody to ask.
     *
     * Granted already: start, because this is a rider who has used the app
     * before and a map that finds them is the whole point. Not granted: wait
     * for `request()`, which is a tap. No Permissions API to consult: start, so
     * those browsers keep working as they did.
     */
    const allowed = permission === 'granted' || touched || !navigator.permissions?.query;
    if (!supported || !enabled || !watch || !allowed) return;

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000
    });

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
    // `recoveries` is in here on purpose: see its definition above.
  }, [supported, enabled, watch, recoveries, permission, touched, handleSuccess, handleError]);

  const isDenied = status === STATUS.DENIED;
  const isInsecure = status === STATUS.INSECURE;

  return {
    position,
    status,
    error,
    supported,
    request,
    isDenied,
    isInsecure,
    /** What the browser says about the permission, when it will tell us. */
    permission,
    /**
     * Whether tapping "Enable location" can actually raise a prompt.
     *
     * A denied permission cannot be re-prompted from script — only the person
     * can undo it in site settings — so a button that claims otherwise is a
     * button that does nothing. The UI uses this to decide between offering the
     * prompt and explaining how to unblock it.
     */
    canPrompt: supported && !isDenied,
    isLocating: status === STATUS.PROMPTING
  };
}

export { STATUS as GEO_STATUS };
