import { useCallback, useEffect, useRef, useState } from 'react';
import { alertSound } from '@/lib/alertSound';
import { useSetting, useUserSettings } from '@/hooks/useUserSettings';

const PREF_KEY = 'raahi.rideAlerts';

/**
 * Buzz, pause, repeated for about as long as a request lives.
 *
 * Alternating on/off durations, which is what the Vibration API takes. Kept in
 * step with the chime so a rider feels and hears the same rhythm.
 */
const BUZZ = Array.from({ length: 16 }, () => [220, 1180]).flat();

/**
 * Buzzes, if the browser will allow it.
 *
 * `navigator.vibrate` needs the same user activation the audio does, and when
 * it does not have it Chrome does not throw — it returns false and writes an
 * error to the console. A try/catch therefore caught nothing and every request
 * on a page nobody had tapped yet left an error behind. `userActivation` is the
 * documented way to ask first; browsers without it (Safari has no Vibration API
 * at all) fall through to the attempt, which is harmless.
 */
function buzz(pattern) {
  try {
    if (typeof navigator.vibrate !== 'function') return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw rather than no-op when vibration is disallowed.
  }
}

/**
 * Whether the rider wants to be told out loud, and whether the browser will
 * let us.
 *
 * Two separate facts, and the UI needs both. "Off" is a choice the rider made.
 * "Blocked" is the browser refusing until it sees a gesture. Showing one as the
 * other is how a rider ends up thinking they turned sound on when nothing can
 * actually make a noise.
 */
/** Mirrors the choice locally, for the next cold start. */
function remember(on) {
  try {
    localStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    // Blocked storage: the server still has it, so only this device's first
    // paint is affected.
  }
}

const savedPreference = () => {
  try {
    // On by default: a rider who installed a driving app wants to know when
    // work arrives. Off is a deliberate choice, so only an explicit "0" counts.
    return localStorage.getItem(PREF_KEY) !== '0';
  } catch {
    return true;
  }
};

/**
 * The request chime, played at most once per request.
 *
 * The "played only once" part is the whole reason this is a hook rather than a
 * call inside a socket handler. A socket event, a refetch and a re-render can
 * all present the same request again, and React may render twice for one state
 * change in development — so anything keyed on "a request is on screen" plays
 * the sound repeatedly. Instead every request id that has ever been announced
 * is remembered, and announcing is idempotent.
 *
 * @param {object[]} offers  the requests currently in front of the rider
 * @param {boolean}  active  whether the rider is in a state to be alerted
 */
export function useRideAlerts(offers, active) {
  /**
   * The choice now lives on the server, in Settings, so it follows the rider to
   * a new phone. localStorage stays as the answer before settings arrive and if
   * they cannot be reached — a rider opening the app to a request should not
   * have that request arrive silently because a fetch was slow.
   */
  const wanted = useSetting('riding.requestSound', savedPreference());
  const vibrate = useSetting('riding.requestVibration', true);
  const { update } = useUserSettings();

  const [ready, setReady] = useState(() => alertSound.ready);

  // Every request already announced. Kept in a ref so it survives re-renders
  // without causing any.
  const announced = useRef(new Set());

  /** Called from a real gesture — a tap on "Enable ride alerts", or the GO button. */
  const enable = useCallback(async () => {
    const ok = await alertSound.unlock();
    setReady(ok);

    if (ok) {
      remember(true);
      update('riding', { 'riding.requestSound': true });
    }

    return ok;
  }, [update]);

  /**
   * The next tap anywhere, whatever it was for.
   *
   * A browser will not let a page make a noise until it has seen a real
   * gesture, and the only gesture this app was using is the tap on GO. That
   * covers a rider who goes online in this tab — and misses the one who was
   * ALREADY online and reloaded, or came back to a restored tab, or navigated
   * in from another screen. Their switch says "on", their setting says sound,
   * and requests arrive in complete silence. That is the failure this fixes.
   *
   * It does not talk its way around the policy: it waits for a genuine gesture,
   * it just stops insisting on one particular button. The rider's next touch —
   * panning the map, opening the menu, anything — is enough.
   *
   * Nothing is written to their settings here. `wanted` is already true, which
   * is why this is running; the browser was the only thing saying no.
   */
  useEffect(() => {
    if (!active || !wanted || ready) return undefined;

    let done = false;

    const onGesture = () => {
      if (done) return;

      // Started synchronously inside the event, because the gesture is only
      // valid for this tick — awaiting anything first forfeits it.
      alertSound.unlock().then((ok) => {
        if (!ok) return;
        done = true;
        setReady(true);
        remove();
      });
    };

    // Capture, so a handler that stops propagation cannot swallow the gesture.
    // Both flags go in one options object — passing `true` as the third
    // argument and an object as a fourth silently drops the object.
    const options = { capture: true, passive: true };
    const events = ['pointerdown', 'keydown', 'touchend'];
    const remove = () => events.forEach((e) => window.removeEventListener(e, onGesture, options));

    events.forEach((e) => window.addEventListener(e, onGesture, options));
    return remove;
  }, [active, wanted, ready]);

  const toggle = useCallback(
    async (next) => {
      if (next) return enable();

      alertSound.stop();
      remember(false);
      update('riding', { 'riding.requestSound': false });
      return false;
    },
    [enable, update]
  );

  /**
   * Announces anything new.
   *
   * Deliberately driven by the offer list rather than by the socket event: the
   * list is what the rider can actually see, so the sound and the card cannot
   * disagree. A request restored after a reconnect is not new and stays quiet.
   */
  useEffect(() => {
    // Vibration is checked separately from sound: a rider can want one and not
    // the other, and a phone that cannot vibrate must not suppress the chime.
    if (!active || (!wanted && !vibrate)) return;

    const fresh = (offers || []).filter((offer) => {
      const id = String(offer?.requestId ?? offer?.rideId ?? '');
      return id && !announced.current.has(id);
    });

    if (!fresh.length) return;

    for (const offer of fresh) {
      announced.current.add(String(offer.requestId ?? offer.rideId));
    }

    if (wanted && ready) alertSound.play();

    // One long pattern rather than one short buzz, for the same reason the
    // chime now repeats: a single 300ms tap is missed by a phone in a pocket.
    // The whole pattern is handed over in one call, so a backgrounded tab's
    // throttled timers cannot break it up, and `buzz(0)` cancels the rest.
    if (vibrate) buzz(BUZZ);
  }, [offers, active, wanted, vibrate, ready]);

  /**
   * Silence as soon as there is nothing to be alerted about.
   *
   * Covers every way a request stops mattering — accepted, rejected, expired,
   * withdrawn by the customer, or the rider going offline — because all of them
   * end with the list empty or `active` false. One rule instead of six
   * call-sites that each have to remember.
   */
  useEffect(() => {
    if (active && (offers || []).length) return;

    alertSound.stop();
    // Cancels the rest of the pattern. Without this a rider keeps buzzing for
    // fifteen seconds after they have already accepted the ride.
    buzz(0);
  }, [offers, active]);

  // Going offline forgets what was announced, so coming back on and being
  // offered the same ride does make a noise. It is new work again by then.
  useEffect(() => {
    if (!active) announced.current.clear();
  }, [active]);

  // Leaving the screen: stop the sound and the buzz. Navigating to the ride
  // unmounts this, and neither should follow the rider there.
  useEffect(
    () => () => {
      alertSound.stop();
      buzz(0);
    },
    []
  );

  return {
    /** The rider wants sound and the browser allows it. */
    on: wanted && ready,
    /** They want it but the browser has not seen a gesture yet. */
    needsGesture: wanted && !ready,
    wanted,
    enable,
    toggle
  };
}
