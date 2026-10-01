import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, LAYERS, ROOT, SCENE } from '@/constants/riderScene';
import { cn } from '@/lib/utils';

import body from '@/assets/rider/body.webp';
import brake from '@/assets/rider/brake.webp';
import calf from '@/assets/rider/calf.webp';
import foreLeg from '@/assets/rider/fore-leg.webp';
import head from '@/assets/rider/head.webp';
import leg from '@/assets/rider/leg.webp';
import shock from '@/assets/rider/shock.webp';
import tyreBack from '@/assets/rider/tyre-back.webp';
import tyreFront from '@/assets/rider/tyre-front.webp';

gsap.registerPlugin(useGSAP);

const SPRITES = { body, brake, calf, foreLeg, head, leg, shock, tyreBack, tyreFront };

/**
 * The supplied Lottie rider, drawn without a Lottie player.
 *
 * WHY NOT JUST SHIP LOTTIE. The player is 45 KB gzipped and would sit in the
 * critical path, because this is the thing shown WHILE everything else loads —
 * a loading animation that has to load first is working against itself. The
 * source file is also 323 KB, almost all of it base64 PNG. Reading the
 * transforms out of it and drawing the artwork directly costs no new runtime
 * (GSAP is already bundled for the intro) and brings the artwork down to about
 * 59 KB of WebP, with the brake glow and the ground shadow redrawn as vector
 * rather than carried as images — between them they were 49 KB of PNG.
 *
 * WHY MATRICES RATHER THAN NESTED GROUPS. In Lottie, which layer a layer is
 * parented to and which layer it sits in front of are two unrelated facts.
 * Here they genuinely disagree: the leg hangs off the calf for movement but is
 * painted behind it. Nesting the groups would get the motion right and the
 * limbs in the wrong order, so each layer is a sibling in paint order carrying
 * its own composed matrix, which is what Lottie itself does.
 */
export function RiderLoader({
  size = 'md',
  /**
   * Whether to play the ride-in.
   *
   * The source animation opens with the bike off the left of the frame and
   * two seconds of it arriving. That is the charm of it on the splash screen,
   * which is on display for long enough to watch. It is the wrong thing for a
   * page transition that may last a third of a second: the loader appears, and
   * what it shows is an empty box with a caption. With this off the first
   * cycle starts at the point the bike is already there.
   */
  entrance = true,
  /** A fixed caption, when the caller knows what is being waited for. */
  label,
  /** Rotated captions, for a general wait. Ignored when `label` is set. */
  messages,
  className
}) {
  const scope = useRef(null);
  const reduced = usePrefersReducedMotion();

  // The same caption contract as the loader this replaces, so every call site
  // keeps working and none of them had to learn a new component.
  const rotating = !label && Array.isArray(messages) && messages.length > 1;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!rotating) return undefined;
    const id = setInterval(() => setIndex((n) => (n + 1) % messages.length), MESSAGE_MS);
    return () => clearInterval(id);
  }, [rotating, messages]);

  /**
   * The visible caption, which a caller can switch off.
   *
   * `label={null}` means the screen already says what is being waited for —
   * the intro has its tagline right underneath — and a second "Loading" under
   * the bike would just be the app talking over itself. An omitted label still
   * defaults to one, so nothing that was not asked to go quiet does.
   */
  const silent = label === null || label === '';
  const caption = silent ? null : label || (messages?.length ? messages[index] : 'Loading');

  useGSAP(
    () => {
      const groups = new Map();
      for (const layer of LAYERS) {
        const node = scope.current.querySelector(`[data-layer="${layer.ind}"]`);
        if (node) groups.set(layer.ind, node);
      }

      const state = { frame: 0 };

      const draw = () => {
        for (const layer of LAYERS) {
          const node = groups.get(layer.ind);
          if (!node) continue;
          const m = compose(layer, state.frame);
          node.setAttribute('transform', `matrix(${m.join(' ')})`);
        }

      };

      if (reduced) {
        // Held at the frame where the bike has arrived and settled, so the
        // screen still says "a rider is coming" without anything moving.
        state.frame = 70;
        draw();
        return;
      }

      const tl = gsap.timeline({ repeat: -1, onUpdate: draw });
      tl.to(state, { frame: SCENE.frames, duration: SCENE.frames / SCENE.fps, ease: 'none' });

      // Only the first cycle is skipped ahead. A loader that outlives one loop
      // is a wait worth showing the whole thing to.
      if (!entrance) tl.progress(ARRIVED_FRAME / SCENE.frames);

      draw();
    },
    { scope, dependencies: [reduced, entrance] }
  );

  return (
    <div
      ref={scope}
      className={cn('flex flex-col items-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-label={caption || 'Loading'}
    >
      <svg
        viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
        className={cn('block h-auto', SIZES[size])}
        aria-hidden
      >
        <defs>
          {/* The source carried the brake glow as a 49 KB PNG of a red blur.
              These stops are its own measured falloff — sampled out of that
              image rather than guessed at, which is how the first attempt ended
              up twice as hot as the original. */}
          <radialGradient id="rider-glow">
            <stop offset="0%" stopColor="#ff2d2d" stopOpacity="0.835" />
            <stop offset="10%" stopColor="#ff2e2e" stopOpacity="0.796" />
            <stop offset="20%" stopColor="#ff2e2e" stopOpacity="0.694" />
            <stop offset="30%" stopColor="#ff2e2e" stopOpacity="0.545" />
            <stop offset="45%" stopColor="#ff2d2d" stopOpacity="0.314" />
            <stop offset="60%" stopColor="#ff3030" stopOpacity="0.125" />
            <stop offset="80%" stopColor="#ff3333" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#ff3333" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={rootTransform()}>
          {LAYERS.filter((layer) => !layer.hidden).map((layer) => (
            <g key={layer.ind} data-layer={layer.ind}>
              {layer.sprite && (
                <image
                  href={SPRITES[layer.sprite]}
                  width={SPRITE_SIZE[layer.sprite][0]}
                  height={SPRITE_SIZE[layer.sprite][1]}
                  // The artwork ships downscaled to what the largest sensible
                  // render needs; this keeps the browser's own scaling smooth
                  // rather than nearest-neighbour.
                  style={{ imageRendering: 'auto' }}
                />
              )}
              {/* Both were images in the source. The shadow is a flat bar —
                  solid #626262 across its whole width, softening only at the
                  very ends — so it is a rounded rect and not a gradient. */}
              {layer.ind === 13 && <rect width={449} height={7} rx={3.5} fill="#626262" />}
              {layer.ind === 1 && <circle cx={231.5} cy={247} r={231.5} fill="url(#rider-glow)" />}
            </g>
          ))}
        </g>
      </svg>

      {caption && <p className="text-[13px] text-muted">{caption}</p>}
    </div>
  );
}

/**
 * The frame by which the bike has ridden into shot.
 *
 * Read off the source rather than picked by eye: the travel track puts it most
 * of the way across by frame 30, and every part of it is inside the frame from
 * there on.
 */
const ARRIVED_FRAME = 30;

/** How long each rotated caption stays up. */
const MESSAGE_MS = 2200;

const SIZES = {
  sm: 'w-[168px]',
  md: 'w-[248px]',
  lg: 'w-[320px]'
};

/**
 * The drawn size of each sprite in composition units.
 *
 * These are the source PNGs' dimensions, not the WebP files' — the artwork was
 * downscaled for weight, and the layout must not move because of it. The
 * browser scales the smaller file back up to the same box.
 */
const SPRITE_SIZE = {
  shock: [228, 203],
  head: [147, 165],
  calf: [247, 111],
  leg: [107, 99],
  foreLeg: [142, 245],
  body: [717, 548],
  tyreBack: [265, 265],
  tyreFront: [265, 265],
  brake: [67, 31]
};

const rootTransform = () =>
  `translate(${ROOT.position[0]} ${ROOT.position[1]}) scale(${ROOT.scale}) translate(${-ROOT.anchor[0]} ${-ROOT.anchor[1]})`;

const BY_IND = new Map(LAYERS.map((layer) => [layer.ind, layer]));

/** Multiplies two 2D affine matrices given as [a, b, c, d, e, f]. */
function multiply(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5]
  ];
}

/** One layer's own transform at `frame`, before its parent is applied. */
function localMatrix(layer, frame) {
  const px = layer.positionX ? valueAt(layer.positionX, frame, 0) : null;
  const position = layer.position || [
    px ?? 0,
    typeof layer.positionY === 'number' ? layer.positionY : valueAt(layer.positionY, frame, 0)
  ];

  const scale = layer.scale || valueAt(layer.scaleKeys, frame, [1, 1]);
  const rotation = layer.rotationKeys ? valueAt(layer.rotationKeys, frame, 0) : layer.rotation || 0;

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // translate(position) · rotate · scale · translate(-anchor), in that order.
  const rs = [cos * scale[0], sin * scale[0], -sin * scale[1], cos * scale[1], 0, 0];
  const t = [1, 0, 0, 1, position[0], position[1]];
  const a = [1, 0, 0, 1, -layer.anchor[0], -layer.anchor[1]];

  return multiply(multiply(t, rs), a);
}

/** A layer's matrix with every parent above it applied. */
function compose(layer, frame) {
  let m = localMatrix(layer, frame);
  let parent = layer.parent;

  // Bounded rather than `while (parent)`: a cycle in the data would otherwise
  // hang the frame, and a loading animation is the worst place to freeze.
  for (let depth = 0; parent && depth < 8; depth += 1) {
    const up = BY_IND.get(parent);
    if (!up) break;
    m = multiply(localMatrix(up, frame), m);
    parent = up.parent;
  }

  return m.map((v) => Math.round(v * 1000) / 1000);
}

/**
 * A keyframed value at `frame`.
 *
 * Linear between keys for the two baked tracks, which carry one key per frame
 * and so need no curve; eased for everything else, where the source's keys are
 * seconds apart and the easing is what makes the motion read as weight rather
 * than as a slide. Both cases use the same code — a one-frame gap makes the
 * easing a no-op.
 */
function valueAt(keys, frame, fallback) {
  if (!keys?.length) return fallback;
  if (frame <= keys[0][0]) return keys[0][1];
  if (frame >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];

  let i = 0;
  while (i < keys.length - 1 && keys[i + 1][0] <= frame) i += 1;

  const [t0, v0] = keys[i];
  const [t1, v1] = keys[i + 1];
  const span = t1 - t0 || 1;
  const eased = t1 - t0 <= 1 ? (frame - t0) / span : ease((frame - t0) / span);

  if (Array.isArray(v0)) return v0.map((v, n) => v + (v1[n] - v) * eased);
  return v0 + (v1 - v0) * eased;
}

/**
 * The source's easing curve, cubic-bezier(0.333, 0, 0.667, 1).
 *
 * Solved by bisection rather than by Newton's method: the curve is evaluated a
 * few dozen times a frame, the range is fixed and well behaved, and twenty
 * halvings land inside a millionth — far tighter than a pixel — without needing
 * a derivative or a guard against a flat tangent.
 */
function ease(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const [x1, y1, x2, y2] = EASE;
  const curve = (p, a, b) => 3 * (1 - p) * (1 - p) * p * a + 3 * (1 - p) * p * p * b + p * p * p;

  let low = 0;
  let high = 1;
  let t = x;

  for (let i = 0; i < 20; i += 1) {
    const at = curve(t, x1, x2);
    if (at < x) low = t;
    else high = t;
    t = (low + high) / 2;
  }

  return curve(t, y1, y2);
}
