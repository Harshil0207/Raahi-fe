import { audioBlocked, audioContext, audioReady, closeAudio, unlockAudio } from './audio';

/**
 * The sound a rider hears when work arrives.
 *
 * Synthesised rather than loaded from a file, and that is a deliberate trade.
 * Two soft sine tones through the Web Audio API cost no network request, cannot
 * 404, need no asset pipeline, and are the same handful of bytes in the bundle
 * whatever the connection is doing — which matters for the one sound that has
 * to work on a parked motorcycle with one bar of signal. A recorded chime would
 * be warmer; it would also be the thing that silently fails to load.
 *
 * THE CONTEXT IS NOT OWNED HERE any more. It moved to `./audio`, shared with
 * the customer's one-shot notification sounds, because two contexts would mean
 * two unlocks — and a person who had already tapped something would still get
 * silence from whichever half had not seen a gesture of its own. Behaviour on
 * this side is unchanged: same tones, same repeat, same stop.
 */

const TONE = [
  // A rising pair — recognisable in traffic without being an alarm.
  { frequency: 660, start: 0, duration: 0.18 },
  { frequency: 880, start: 0.16, duration: 0.26 }
];

/**
 * Loud enough to be a ring rather than a hint.
 *
 * This was 0.22, which measured as a four-tenths-of-a-second whisper — audible
 * in a quiet room with the tab in front of you, and missed completely by a
 * rider whose phone is in a jacket or whose attention is anywhere else.
 */
const PEAK = 0.5;

/** How often the ring repeats while a request is still on screen. */
const REPEAT_SECONDS = 1.4;

/**
 * How long it keeps ringing if nothing stops it.
 *
 * A request lives about twenty seconds, so this covers one offer and then falls
 * silent by itself. It is a backstop, not the mechanism: `stop()` is what
 * normally ends it, the moment the request is accepted, rejected, expired or
 * withdrawn.
 */
const MAX_RINGS = 16;

class AlertSound {
  constructor() {
    this.playing = new Set();
  }

  /** The shared context, or null before anything has woken it. */
  get context() {
    return audioContext();
  }

  /** Whether a sound would actually be heard if we tried right now. */
  get ready() {
    return audioReady();
  }

  get blocked() {
    return audioBlocked();
  }

  /**
   * Call from a real user gesture. Creates the context and resumes it, which is
   * the only moment a browser will allow either.
   */
  async unlock() {
    return unlockAudio();
  }

  /**
   * One two-tone pair. `gain` of 0 makes it inaudible but still schedules it,
   * which is how the unlock wakes the hardware without startling anyone.
   *
   * `offset` places the pair further along the context's own clock. Scheduling
   * ahead on the audio timeline rather than with `setInterval` is deliberate:
   * a backgrounded tab has its timers throttled to about once a minute, and a
   * backgrounded tab is exactly where a rider's app sits while they are looking
   * at something else. The audio clock is not throttled, so a ring scheduled
   * now still sounds on time ten seconds later.
   */
  blip(gain = PEAK, offset = 0) {
    if (!this.context) return;

    const now = this.context.currentTime + offset;

    for (const note of TONE) {
      const osc = this.context.createOscillator();
      const amp = this.context.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.frequency;

      // Ramped rather than switched: a square-edged gain change is a click.
      const at = now + note.start;
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(gain, at + 0.02);

      // An exponential ramp is undefined from a value of zero, which is what
      // the silent unlock pair sits at. It has nothing to decay from anyway.
      if (gain > 0) amp.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);

      osc.connect(amp).connect(this.context.destination);
      osc.start(at);
      osc.stop(at + note.duration + 0.02);

      this.playing.add(osc);
      osc.onended = () => this.playing.delete(osc);
    }
  }

  /**
   * Rings until something stops it.
   *
   * THIS USED TO BE ONE PAIR OF TONES. The comment above it claimed two with a
   * gap; the code played one, about four tenths of a second at a fifth of full
   * gain, and then the request sat on screen in silence for the twenty seconds
   * it had left. Measured against a rider who is not already staring at the
   * phone, that is not an alert — it is a sound you can only notice if you were
   * not going to miss the request anyway.
   *
   * A ring that keeps going until the work is taken or the offer dies is what
   * this is for, and `stop()` is called on every one of those endings. The
   * whole train is scheduled up front on the audio clock so a background tab's
   * throttled timers cannot silence the repeats.
   *
   * Returns whether it was actually audible, so a caller can tell the
   * difference between "played" and "the browser would not let us".
   */
  play() {
    if (!this.ready) return false;

    // One train at a time. A second request arriving mid-ring restarts the
    // ring rather than layering a second one over it.
    this.stop();

    for (let i = 0; i < MAX_RINGS; i += 1) this.blip(PEAK, i * REPEAT_SECONDS);

    return true;
  }

  /**
   * Cuts anything sounding OR still queued.
   *
   * Used the moment a request stops being relevant — accepted, rejected,
   * expired, withdrawn, or the rider going offline. A chime that outlives the
   * card it belongs to is worse than no chime, and now that the ring is a train
   * of pairs scheduled seconds into the future, most of what this cancels has
   * not started yet. `stop()` with no argument ends at the current time, which
   * for a note due later means it never sounds at all.
   */
  stop() {
    for (const osc of this.playing) {
      try {
        osc.stop();
      } catch {
        // Already finished; nothing to stop.
      }
    }
    this.playing.clear();
  }

  /**
   * Releases the audio hardware.
   *
   * Closes the SHARED context, so this is for a tab that is going away and not
   * for a screen that is — closing it here would silence the customer's
   * notifications too.
   */
  close() {
    this.stop();
    closeAudio();
  }
}

/**
 * One instance for the tab.
 *
 * Shared because the unlock is a property of the page, not of a component: a
 * rider who enables alerts on the driving screen should not have to do it again
 * after visiting Earnings. Each component that plays it cleans up its own
 * timers and listeners; the context itself belongs to the app.
 */
export const alertSound = new AlertSound();
