import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import {
  BIKE_ANCHOR,
  BIKE_SHAPES,
  BIKE_TRAVEL,
  RIDE_SECONDS,
  SCENE,
  TRACK,
  WHEEL_ANCHOR,
  WHEEL_SHAPES,
  WHEEL_TRAVEL,
  brandEase
} from '@/constants/brand';

gsap.registerPlugin(useGSAP);

/**
 * Raahi's loading animation: a cyclist riding a bar that fills behind them.
 *
 * This is the platform's waiting state — the opening screen, a page whose code
 * is still arriving, a screen waiting on the server. The artwork and the motion
 * are the supplied Lottie composition, reproduced from its own path data and
 * checked against the real player frame by frame; see `constants/brand.js` for
 * why the file is not simply played here.
 *
 * WHAT IT IS NOT FOR: a button. A button that is submitting needs a 16px mark
 * inside itself, not a scene — `Spinner` in `ui/misc` stays exactly as it is.
 *
 * The wheel that rides past is the Raahi mark. Not a copy of it: the same
 * shapes, from the same module, so the logo in the corner and the wheel going
 * by are one object seen twice.
 *
 * Motion is one GSAP timeline, built inside `useGSAP` and scoped to this
 * element, so it is reverted on unmount with nothing left running.
 */

/** Width in pixels; the height follows the composition's own proportions. */
const SIZES = {
  sm: { width: 168, gap: 'gap-2.5', text: 'text-[12px]' },
  md: { width: 232, gap: 'gap-3', text: 'text-[13px]' },
  lg: { width: 300, gap: 'gap-3.5', text: 'text-[13.5px]' }
};

/**
 * How long one message stays before the next.
 *
 * Long enough to read twice. A loader whose caption flickers is a loader that
 * reads as broken, and most loads never reach the second message at all.
 */
const MESSAGE_MS = 2400;

/** The artwork, drawn once and moved by the timeline below. */
function Shapes({ shapes }) {
  return shapes.map((shape, i) => (
    // Fixed artwork in a fixed order; nothing reorders these.
    <path key={i} d={shape.d} fill={shape.fill} fillRule={shape.evenodd ? 'evenodd' : undefined} />
  ));
}

export function BikeLoader({
  size = 'md',
  /** A fixed caption, when the caller knows what is being waited for. */
  label,
  /** Rotated captions, for a general wait. Ignored when `label` is set. */
  messages,
  className
}) {
  const reduced = usePrefersReducedMotion();
  const scope = useRef(null);
  const spec = SIZES[size] || SIZES.md;

  const rotating = !label && Array.isArray(messages) && messages.length > 1;
  const [index, setIndex] = useState(0);

  // Rotate the caption. Not tied to progress, because there is no progress to
  // report — it is a sign of life, so it must never claim a stage it cannot know.
  useEffect(() => {
    if (!rotating) return undefined;
    const id = setInterval(() => setIndex((n) => (n + 1) % messages.length), MESSAGE_MS);
    return () => clearInterval(id);
  }, [rotating, messages]);

  const caption = label || (messages?.length ? messages[index] : 'Loading');

  useGSAP(
    () => {
      /**
       * Reduced motion: the scene holds still, part way along.
       *
       * Frozen at the start it reads as a bar at zero and a cyclist about to
       * leave the frame, which looks like a load that has not begun. Held a
       * third of the way through it reads as a journey underway — the same
       * information the motion carries, without the motion.
       */
      if (reduced) return;

      const bike = scope.current.querySelector('[data-bike]');
      const wheel = scope.current.querySelector('[data-wheel]');
      const spin = scope.current.querySelector('[data-spin]');
      const track = scope.current.querySelector('[data-track]');

      /**
       * One ride, repeated.
       *
       * Every tween runs for the same duration on the same easing curve and
       * starts at position 0, which is what keeps the wheel under the rider.
       * The curve is the composition's own; a linear ride agrees with the
       * source at the two ends and drifts visibly in between.
       */
      const timeline = gsap.timeline({ repeat: -1, defaults: { duration: RIDE_SECONDS, ease: brandEase } });

      timeline
        .fromTo(
          bike,
          { x: BIKE_TRAVEL.from - BIKE_ANCHOR[0] },
          { x: BIKE_TRAVEL.to - BIKE_ANCHOR[0] },
          0
        )
        .fromTo(
          wheel,
          { x: WHEEL_TRAVEL.from - WHEEL_ANCHOR[0] },
          { x: WHEEL_TRAVEL.to - WHEEL_ANCHOR[0] },
          0
        )
        .fromTo(spin, { rotation: 0 }, { rotation: WHEEL_TRAVEL.spin }, 0)
        // `pathLength="1"` below makes the dash units a fraction of the line,
        // so the bar fills from empty to full whatever width it is drawn at.
        .fromTo(track, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 } }, 0);

      return () => timeline.kill();
    },
    { scope, dependencies: [reduced] }
  );

  const height = Math.round((spec.width * SCENE.height) / SCENE.width);

  // Where the still frame sits when motion is turned off.
  const held = reduced ? brandEase(0.36) : 0;

  return (
    <div
      ref={scope}
      className={cn('flex flex-col items-center', spec.gap, className)}
      // The animation must never be the only way to know the app is working.
      role="status"
      aria-live="polite"
    >
      <svg
        viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
        width={spec.width}
        height={height}
        className="block"
        aria-hidden
        focusable="false"
      >
        {/* The bar the cyclist is riding along, drawn behind them. */}
        <g transform={`translate(0 ${TRACK.y})`}>
          <path
            data-track
            d={TRACK.d}
            fill="none"
            stroke={TRACK.colour}
            strokeWidth={TRACK.width}
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={reduced ? 1 - held : 1}
          />
        </g>

        <g data-bike transform={`translate(${BIKE_TRAVEL.from + (BIKE_TRAVEL.to - BIKE_TRAVEL.from) * held - BIKE_ANCHOR[0]} 0)`}>
          <Shapes shapes={BIKE_SHAPES} />
        </g>

        <g
          data-wheel
          transform={`translate(${WHEEL_TRAVEL.from + (WHEEL_TRAVEL.to - WHEEL_TRAVEL.from) * held - WHEEL_ANCHOR[0]} ${WHEEL_TRAVEL.y - WHEEL_ANCHOR[1]})`}
        >
          {/* Rotated about the wheel's own centre, which is the layer anchor. */}
          <g data-spin transform-origin={`${WHEEL_ANCHOR[0]} ${WHEEL_ANCHOR[1]}`}>
            <Shapes shapes={WHEEL_SHAPES} />
          </g>
        </g>
      </svg>

      {/**
       * The caption, crossfaded by key rather than by a tween: React swaps the
       * node, the CSS animation plays on the new one, and there is no state to
       * get stuck part-way. A stuck opacity is how a page ends up blank.
       */}
      <p key={caption} className={cn('caption-in text-center font-medium text-muted', spec.text)}>
        {caption}
      </p>
    </div>
  );
}
