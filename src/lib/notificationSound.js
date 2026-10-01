import { audioContext, audioReady } from './audio';

/**
 * The customer's one-shot notification sounds.
 *
 * Deliberately NOT the rider's request ring. That one repeats for the life of
 * an offer because a rider needs to be interrupted; these mark something that
 * has already happened and has nothing to be answered. Two short notes and
 * they are gone.
 *
 * ONE INSTANCE FOR THE TAB, at module scope, because the thing that must not be
 * duplicated is the record of what has already been played — a manager created
 * per render or per screen would forget on every navigation, which is exactly
 * the replay this is built to prevent.
 *
 * Synthesised, like the ring, and for the same reasons: no network request to
 * fail, no asset to 404, the same few bytes whatever the connection is doing.
 * A notification that goes silent because an mp3 did not load is worse than one
 * that is a little plainer.
 */

/**
 * The two sounds, and why they differ.
 *
 * Rising for acceptance — something good has started. Falling and lower for
 * arrival — something has settled, and it is the one that may reach somebody
 * standing on a pavement not looking at their phone, so it is a touch longer.
 * Neither resembles the rider's 660→880 request ring.
 */
const TONES = {
  'ride-accepted': [
    { frequency: 587.33, start: 0, duration: 0.14 },
    { frequency: 880, start: 0.11, duration: 0.24 }
  ],
  'rider-arrived': [
    { frequency: 784, start: 0, duration: 0.16 },
    { frequency: 523.25, start: 0.14, duration: 0.3 }
  ]
};

const PEAK = 0.42;

/**
 * Where the record of what has been played survives a page refresh.
 *
 * `sessionStorage`, not `localStorage` and not React state:
 *
 *   - State is wrong because a component that unmounts forgets, and the brief's
 *     whole point is that navigating away and back must not replay. It is also
 *     wrong because two rapid events read a stale snapshot.
 *   - `localStorage` is wrong because it would remember across tabs and across
 *     days. A ride accepted last week has no business silencing anything, and
 *     nothing ever cleans it up.
 *   - `sessionStorage` is per tab and dies with it, which is exactly the
 *     lifetime of "this visit". A refresh keeps it; closing the tab drops it.
 *
 * The in-memory set is the source of truth and storage is its mirror, so a
 * browser with storage blocked still gets everything except surviving a
 * refresh — degraded, never broken.
 */
const STORAGE_KEY = 'raahi.playedNotifications';

/** Enough for a long session; oldest fall off rather than growing forever. */
const MAX_REMEMBERED = 200;

class NotificationSound {
  constructor() {
    this.played = new Set(readStored());
    this.playing = new Set();
  }

  /**
   * Whether this exact event has already been announced.
   *
   * The key is the caller's business — `rideId:EVENT` — and it is what makes a
   * socket reconnect, a remount and a refresh all land on "already done".
   */
  alreadyPlayed(key) {
    return this.played.has(key);
  }

  /**
   * Spends a key, and says whether it was still unspent.
   *
   * THE ONE PLACE that decides whether an event has already been announced —
   * for the sound and for the alert alike. There used to be a second check in
   * the hook that ran first, and between them no test could prove either one
   * worked: break one and the other quietly covered for it. Two guards for one
   * decision is one guard nobody is watching.
   *
   * Claiming and recording are the same call on purpose. Anything that checks
   * first and records later leaves a window between the two, and the event this
   * exists for is precisely the one that arrives twice.
   */
  claim(key) {
    if (!key || this.played.has(key)) return false;
    this.markPlayed(key);
    return true;
  }

  /** Records a key without making a sound. For an event that arrived muted. */
  markPlayed(key) {
    if (!key || this.played.has(key)) return;

    this.played.add(key);

    // Trim from the front: insertion order is arrival order.
    if (this.played.size > MAX_REMEMBERED) {
      const excess = this.played.size - MAX_REMEMBERED;
      const iterator = this.played.values();
      for (let i = 0; i < excess; i += 1) this.played.delete(iterator.next().value);
    }

    writeStored([...this.played]);
  }

  /**
   * Plays a sound once for this key, ever.
   *
   * Returns why nothing happened, rather than a bare boolean, because the three
   * silences are different and the caller may want to say different things:
   * `duplicate` is working correctly, `blocked` is the browser, `unknown` is a
   * programming mistake.
   *
   * CLAIMS BEFORE IT PLAYS. Two events arriving in the same tick would both see
   * an unspent key and both play; claiming first means the second returns
   * immediately. It also means a sound the browser refuses is still recorded —
   * which is right, because the alternative is it firing later, out of context,
   * at whatever moment audio happens to become available.
   */
  playOnce(key, name) {
    const tone = TONES[name];
    if (!key || !tone) return 'unknown';

    if (!this.claim(key)) return 'duplicate';

    if (!audioReady()) return 'blocked';

    try {
      this.emit(tone);
      return 'played';
    } catch {
      // A context that refuses to schedule is not a reason to lose the event.
      return 'blocked';
    }
  }

  /** Named helpers, so call sites read as what they mean. */
  playRideAccepted(rideId) {
    return this.playOnce(`${rideId}:RIDE_ACCEPTED`, 'ride-accepted');
  }

  playRiderArrived(rideId) {
    return this.playOnce(`${rideId}:RIDER_ARRIVED`, 'rider-arrived');
  }

  /** One pair of notes. Never scheduled more than once; there is no repeat. */
  emit(tone) {
    const context = audioContext();
    if (!context) return;

    const now = context.currentTime;

    for (const note of tone) {
      const osc = context.createOscillator();
      const amp = context.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.frequency;

      const at = now + note.start;
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(PEAK, at + 0.015);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);

      osc.connect(amp).connect(context.destination);
      osc.start(at);
      osc.stop(at + note.duration + 0.02);

      this.playing.add(osc);
      osc.onended = () => this.playing.delete(osc);
    }
  }

  /**
   * Cuts anything still sounding.
   *
   * Rarely needed — these are under half a second — but a tab going away should
   * not leave a note hanging, and the rider's ring has the same courtesy.
   */
  stop() {
    for (const osc of this.playing) {
      try {
        osc.stop();
      } catch {
        // Already finished.
      }
    }
    this.playing.clear();
  }

  /** For tests, and for signing out: forgets what has been announced. */
  reset() {
    this.played.clear();
    writeStored([]);
  }
}

function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
  } catch {
    // Private mode, blocked storage, or somebody else's JSON in our key. The
    // in-memory set still works for this page's lifetime.
    return [];
  }
}

function writeStored(keys) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // As above: the worst case is a replay after a refresh, not a crash.
  }
}

export const notificationSound = new NotificationSound();
