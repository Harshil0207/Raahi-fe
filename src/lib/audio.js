/**
 * The tab's one audio context, and the gesture that wakes it.
 *
 * Extracted because there are now two things that make a noise — the rider's
 * repeating request ring and the customer's one-shot notifications — and they
 * must not each own a context. Two contexts means two unlocks: a customer who
 * tapped something before the ring existed would still get silence from the
 * notification, for no reason a person could ever work out.
 *
 * Everything about the browser rule lives here. A page may not make noise until
 * it has seen a real gesture; a context created before that starts `suspended`,
 * and resuming it from anything but a genuine gesture is refused. `unlock()`
 * has to be called from a click or a tap, `ready` reports honestly whether that
 * has happened, and `armOnNextGesture()` waits for one rather than demanding a
 * particular button. Nothing here tries to talk its way around the rule.
 */

let context = null;

/** Whether a sound would actually be heard if we tried right now. */
export const audioReady = () => Boolean(context) && context.state === 'running';

/** Created but not permitted: the browser has not seen a gesture yet. */
export const audioBlocked = () => Boolean(context) && context.state === 'suspended';

/** The live context, or null. Callers must check `audioReady()` first. */
export const audioContext = () => context;

/**
 * Call from a real user gesture. Creates the context and resumes it, which is
 * the only moment a browser will allow either.
 *
 * Resolves to whether sound is now possible, so a caller can tell "the person
 * turned it off" from "the browser will not let us" — two states that look the
 * same and need opposite words.
 */
export async function unlockAudio() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return false;

  try {
    if (!context) context = new Ctor();
    if (context.state === 'suspended') await context.resume();

    // Some browsers only truly wake on the first scheduled sound, so a silent
    // one gets that out of the way while the gesture is still valid. Silent, so
    // enabling alerts is not itself an alert.
    silentBlip();

    return audioReady();
  } catch {
    return false;
  }
}

/** A scheduled, inaudible note. Enough to wake the hardware, nothing to hear. */
function silentBlip() {
  if (!context) return;

  try {
    const osc = context.createOscillator();
    const amp = context.createGain();

    amp.gain.setValueAtTime(0, context.currentTime);
    osc.connect(amp).connect(context.destination);
    osc.start(context.currentTime);
    osc.stop(context.currentTime + 0.01);
  } catch {
    // A context that refuses to schedule is a context that will not play
    // either; `ready` will say so.
  }
}

/**
 * Unlocks on the person's next gesture, whatever it was for.
 *
 * The browser needs a gesture; it does not need a particular one. Waiting for a
 * specific button means anybody who never presses that button gets silence —
 * which is most people, most of the time. Panning a map or opening a menu is
 * enough, and none of this bypasses the policy: it still waits for a real
 * interaction.
 *
 * Returns a teardown function, so an effect can drop the listeners when the
 * screen goes away.
 */
export function armAudioOnNextGesture(onUnlocked) {
  if (audioReady()) {
    onUnlocked?.(true);
    return () => {};
  }

  let done = false;
  const options = { capture: true, passive: true };
  const events = ['pointerdown', 'keydown', 'touchend'];

  const handle = () => {
    if (done) return;

    // Started synchronously inside the event: the gesture is only valid for
    // this tick, and awaiting anything first forfeits it.
    unlockAudio().then((ok) => {
      if (!ok) return;
      done = true;
      remove();
      onUnlocked?.(true);
    });
  };

  const remove = () => events.forEach((name) => window.removeEventListener(name, handle, options));

  events.forEach((name) => window.addEventListener(name, handle, options));
  return remove;
}

/** Releases the hardware. Only for a tab that is going away. */
export function closeAudio() {
  if (context && context.state !== 'closed') context.close().catch(() => {});
  context = null;
}
