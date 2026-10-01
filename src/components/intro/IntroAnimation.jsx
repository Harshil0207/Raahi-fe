import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { LogoReveal } from './LogoReveal';
import { TextReveal } from './TextReveal';
import { RiderLoader } from '@/components/loading/RiderLoader';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

gsap.registerPlugin(useGSAP);

/**
 * The first thing Raahi shows.
 *
 * DRIVEN BY READINESS, NOT BY A TIMER. The sequence plays, then waits: the
 * outro runs once the app says it is ready *and* the sequence has finished,
 * whichever is later. On a warm load that is the sequence's own length and not
 * a millisecond more; on a cold one the wait is covered by something worth
 * looking at. Neither case is padding, and there is no `setTimeout(…, 5000)`
 * anywhere in it.
 *
 * If the app is still not ready when the sequence ends, the bike takes over on
 * the same road the sequence just drew. That is the difference between a splash
 * screen and a loading screen, and doing it in one place is what stops the user
 * seeing two loaders in a row.
 *
 * GSAP earns its place here, where a CSS keyframe would not: this is six
 * offset movements that must be able to hand over to an exit at an arbitrary
 * point in the middle. A keyframe cannot be told "finish early, from wherever
 * you are". A timeline can, and `useGSAP` reverts the whole thing on unmount.
 */

/**
 * How long the sequence takes, and the longest the cover may ever stay.
 *
 * `SEQUENCE_MS` is the floor because cutting a brand animation off half-played
 * looks like a fault, and a fifth of a second saved is not worth that. It sits
 * inside the 1.5–2.5s an opening should take.
 *
 * `MAX_HOLD_MS` is a safety valve, not a delay: if readiness never arrives —
 * a session restore that hangs on a dead network — the cover lifts anyway. The
 * app underneath is mounted the whole time and has its own loading states, and
 * those now draw the same bike, so lifting is a handover rather than a jump.
 */
const SEQUENCE_MS = 1500;
const MAX_HOLD_MS = 6000;

const TAGLINE = 'Modern Ride. Simple Journey.';

/**
 * How far apart the letters start, in pixels.
 *
 * The 0.23em the old `letterSpacing` tween travelled, at the word's 26px, so
 * the opening tracks in by the same distance it always did — as a transform
 * rather than as a relayout. A constant because a transform cannot take `em`.
 */
const TRACKING_PX = 6;

/** What to say while the wait continues past the opening. */
const WAITING = ['Getting things ready…', 'Almost there…'];

export function IntroAnimation({ ready, onDone }) {
  const reduced = usePrefersReducedMotion();

  const root = useRef(null);
  const finished = useRef(false);
  // Stamped in an effect rather than during render: reading the clock while
  // rendering makes the result depend on when React happened to run.
  const startedAt = useRef(0);

  const [gone, setGone] = useState(false);
  // The opening has played and the app still is not ready, so the bike rides.
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // ------------------------------------------------------------- the sequence
  useGSAP(
    () => {
      if (reduced) {
        // Reduced motion gets the same scene, assembled rather than performed:
        // one fade, no movement, no stagger, no blur.
        gsap.set(['[data-intro-halo]', '[data-intro-tile]', '[data-intro-word]', '[data-intro-tagline]'], { opacity: 1 });
        gsap.set('[data-intro-route]', { opacity: 1, y: 0 });
        return undefined;
      }

      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

      timeline
        // 1 — the ground the mark stands on.
        .fromTo('[data-intro-halo]', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.6 }, 0)

        // 2/3/4 — small and soft, then up and sharp. The blur is what makes it
        // arrive rather than merely appear.
        .fromTo(
          '[data-intro-tile]',
          { opacity: 0, scale: 0.84, filter: 'blur(10px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.62 },
          0.04
        )

        /**
         * The lane-dash tween is gone, and it had to go.
         *
         * `[data-mark-dash]` is not rendered by anything — the dashes inside
         * the mark were removed and this tween outlived them. A GSAP tween with
         * no targets is not silent: it warned once on creation and twice more
         * when the timeline reverted, so the production console carried three
         * "GSAP target not found" lines on every single page load. Nothing
         * animated, because there was nothing to animate.
         *
         * Positions in this timeline are absolute numbers, so removing a step
         * shifts none of the others.
         */

        /**
         * 5 — the word, character by character, and the tracking settling in.
         *
         * SAME LOOK, DIFFERENT PROPERTIES. This used to animate the word's
         * `letterSpacing` and blur every character. Both were measurably
         * expensive: letter spacing is a layout property, so each of the 43
         * frames re-laid out the word and everything after it, and five
         * simultaneously blurred elements kept the compositor busy for the
         * whole opening. Measured on a throttled phone, the two together cost
         * about 180ms of blocking time and half a second of largest-paint.
         *
         * The tracking is now per-character `x`, which is a transform: the
         * letters start spread by the same 0.23em and slide home, so the word
         * still tightens as it arrives, but nothing is re-laid out. The blur
         * stays on the tile above, where one element can afford it and where
         * the softness is actually what reads as "arriving".
         */
        .fromTo(
          '[data-intro-char]',
          { opacity: 0, yPercent: 55, x: (i) => i * TRACKING_PX },
          { opacity: 1, yPercent: 0, x: 0, duration: 0.5, stagger: 0.045 },
          0.44
        )

        // 6 — the rider fades up under the name. A scaleX draw was right for
        // the line this replaced; scaling a bike horizontally is not.
        .fromTo(
          '[data-intro-route]',
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          0.7
        )

        // The tagline last, and quietly.
        .fromTo(
          '[data-intro-tagline]',
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.42 },
          0.92
        );

      return () => timeline.kill();
    },
    { scope: root, dependencies: [reduced] }
  );

  // ----------------------------------------------------------- the handover
  /**
   * Once the opening has played, if the app still is not ready, the road gains
   * a bike. Same place, same width — so it reads as the journey starting, not
   * as one screen replacing another.
   */
  useEffect(() => {
    if (ready) return undefined;

    const elapsed = Date.now() - startedAt.current;
    const id = setTimeout(() => setWaiting(true), Math.max(SEQUENCE_MS - elapsed, 0));
    return () => clearTimeout(id);
  }, [ready]);

  // ---------------------------------------------------------------- the exit
  useEffect(() => {
    if (finished.current) return undefined;

    const leave = () => {
      if (finished.current) return;
      finished.current = true;

      // Fired as the cover starts lifting, not after — so the app is
      // interactive underneath while the last frames play.
      onDone?.();

      if (reduced) {
        setGone(true);
        return;
      }

      gsap
        .timeline({ onComplete: () => setGone(true) })
        // Settling back rather than scaling away: the mark recedes, it does not
        // get thrown at the viewer.
        .to('[data-intro-stage]', { scale: 0.96, opacity: 0, duration: 0.34, ease: 'power2.in' })
        // The cover itself goes last and slightly slower, which is what keeps
        // the join free of a flash — the app is already behind it, at full
        // opacity, on the same background colour.
        .to(root.current, { opacity: 0, duration: 0.28, ease: 'power1.inOut' }, '-=0.22');
    };

    const elapsed = Date.now() - startedAt.current;

    if (ready) {
      // Let the opening finish. Cutting it short to save 200ms would be the
      // one thing worse than the 200ms.
      const id = setTimeout(leave, Math.max(SEQUENCE_MS - elapsed, 0));
      return () => clearTimeout(id);
    }

    // Still loading: hold, but never past the safety valve.
    const id = setTimeout(leave, Math.max(MAX_HOLD_MS - elapsed, 0));
    return () => clearTimeout(id);
  }, [ready, reduced, onDone]);

  // The exit timeline is created outside `useGSAP`, so it is killed by hand.
  useEffect(
    () => () => {
      if (root.current) gsap.killTweensOf(root.current);
    },
    []
  );

  if (gone) return null;

  return (
    <div
      ref={root}
      // A cover, not a document. A screen reader should be reading the app
      // underneath rather than announcing a decoration — and once the wait is
      // long enough to need announcing, the bike loader below carries its own
      // live region.
      aria-hidden={!waiting}
      className="fixed inset-0 z-[60] grid place-items-center bg-app px-6"
      // Safe areas, so nothing lands under the notch or the home indicator on
      // a phone. `grid place-items-center` keeps the stage centred between them.
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div data-intro-stage className="flex w-full max-w-[20rem] flex-col items-center">
        <LogoReveal />

        <span
          data-intro-word
          className="mt-5 text-[26px] font-semibold leading-none text-body"
          style={{ letterSpacing: '-0.01em' }}
        >
          <TextReveal text="Raahi" />
        </span>

        {/**
         * The road, and who is on it.
         *
         * The rider is the opening now, not a state the opening falls back to.
         * It used to appear only once the wait outlasted the sequence, which on
         * anything but a cold start meant never — the animation existed and
         * almost nobody saw it.
         *
         * One element in both states, so nothing swaps or cross-fades; only the
         * line underneath changes, from the tagline to what is being waited
         * for. The box is a fixed height either way, because a splash screen
         * that grows as it changes state reads as a stumble.
         */}
        <div data-intro-route className="relative mt-3 grid w-full place-items-center">
          <RiderLoader
            size="md"
            label={waiting ? undefined : null}
            messages={waiting ? WAITING : undefined}
          />
        </div>

        <p data-intro-tagline className="mt-1 text-center text-[13px] text-muted">
          {waiting ? '' : TAGLINE}
        </p>
      </div>
    </div>
  );
}
