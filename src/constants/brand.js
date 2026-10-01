/**
 * The Raahi mark and the loading animation, as vector data.
 *
 * Both come from the same source: the supplied After Effects export of a
 * cyclist riding a filling progress bar. The paths below were extracted from
 * that file and checked against the real Lottie player frame by frame — eleven
 * frames, worst disagreement 0.03% of inked pixels, which is antialiasing.
 *
 * WHY NOT SHIP THE LOTTIE ITSELF. Playing the file needs lottie-web, which is
 * 47 kB gzipped even in its light build — a third again on top of the whole
 * app bundle, downloaded before the loading animation can appear. A loading
 * animation that waits on a 47 kB download to tell you something is loading
 * has the problem it was meant to solve. The artwork is four shapes and three
 * transforms; as inline SVG driven by the GSAP already in the bundle it costs
 * nothing extra and paints immediately.
 *
 * Coordinates are the composition's own, 1242 x 184, so the numbers here can
 * be read straight off the source file. Nothing is pre-translated: everything
 * that moves does so through a transform below, which is also what keeps the
 * mark and the animation the same artwork rather than two drifting copies.
 */

export { BRAND } from './brandMark.js';

/** The composition, in its own units. */
export const SCENE = { width: 1242, height: 184 };

/**
 * The rider and the frame, minus the front wheel — that spins separately.
 *
 * Drawn at the layer's own coordinates; the layer's anchor is subtracted where
 * it is used, so BIKE_ANCHOR is what turns these into screen positions.
 */
export const BIKE_SHAPES = [
  { fill: "#00ada5", d: "M154.083 19.502 C154.205 30.398 162.492 38.2 173.763 38.031 C184.313 37.872 192.3 29.361 192.108 18.481 C191.926 8.066 183.236 -0.126 172.508 0.002 C161.976 0.127 153.961 8.609 154.083 19.502Z" },
  { fill: "#1c7257", d: "M139.433 85.431 C133.355 93.247 127.75 100.121 122.592 107.315 C121.239 109.202 120.783 112.081 120.774 114.508 C120.757 119.068 121.367 123.629 121.807 129.379 C125.458 124.984 128.301 121.422 131.29 117.987 C144.24 103.108 160.201 92.619 178.58 85.665 C179.641 85.265 180.555 84.476 181.537 83.868 C180.604 83.037 179.802 81.932 178.719 81.416 C158.816 71.939 137.806 66.036 116.146 62.321 C110.97 61.433 110.303 62.303 111.66 67.463 C112.423 70.37 113.742 73.199 114.047 76.142 C114.554 81.029 117.635 81.806 121.64 82.325 C127.539 83.088 133.374 84.347 139.433 85.431Z" },
  { fill: "#00ada5", d: "M51.322 36.638 C52.657 37.341 54.173 37.83 55.301 38.779 C76.704 56.78 90.929 79.391 97.824 106.442 C101.256 119.905 102.444 133.698 101.252 147.605 C101.019 150.315 100.818 152.492 104.588 152.67 C111.478 152.995 112.316 152.656 112.56 148.226 C114.292 116.806 109.541 86.333 99.205 56.673 C98.981 56.03 98.796 55.366 98.673 54.697 C98.602 54.315 98.693 53.903 98.731 53.061 C100.73 53.061 102.715 52.868 104.653 53.09 C135.256 56.594 164.326 65.205 191.824 79.151 C193.875 80.19 196.515 80.552 198.849 80.454 C205.943 80.159 213.022 79.495 220.105 78.944 C221.002 78.874 221.885 78.618 223.062 78.395 C220.911 73.696 218.483 71.05 212.819 70.432 C180.671 66.923 156.967 50.435 141.714 22 C139.744 18.328 137.695 16.767 133.533 16.981 C113.762 17.997 94.354 21.084 75.403 26.815 C67.713 29.14 60.139 31.849 52.513 34.384 C52.513 34.384 51.322 36.638 51.322 36.638Z" },
  { fill: "#1c7257", d: "M0.001 137.334 C0.001 163.327 20.638 183.831 46.723 183.903 C72.358 183.975 93.298 162.199 93.005 136.862 C92.74 113.865 74.985 90.563 46.266 90.719 C18.318 90.87 -0.153 113.053 0.001 137.334Z" }
];

export const BIKE_ANCHOR = [46.6,137.3];

export { WHEEL_SHAPES, WHEEL_ANCHOR } from './brandMark.js';

/** Where the wheel starts and ends, and how far it turns getting there. */
export const WHEEL_TRAVEL = { from: 164.114, to: 1406, y: 135.171, spin: 2160 };

/** Where the bike starts and ends. */
export const BIKE_TRAVEL = { from: 0, to: 1242 };

/** The bar that fills underneath, and where it sits in the composition. */
export const TRACK = {
  d: "M0 7 C0 7 1242.001 7 1242.001 7",
  width: 14,
  colour: "#1c7257",
  y: 169.5
};

/**
 * The mark on its own: the front wheel, cropped to itself.
 *
 * A circle 93.11 across whose centre is the layer anchor, so this is the wheel
 * exactly as it appears in the animation rather than a redrawn version of it.
 * It survives 16px — checked against the mark it replaces at every favicon
 * size — because it is one solid disc with a single cut-out shape inside.
 */
export { MARK_BOX, MARK_VIEWBOX } from './brandMark.js';

/**
 * The composition's keyframe easing, as a function.
 *
 * cubic-bezier(0.167, 0.167, 0.833, 0.833) — a gentle symmetric ease. Matching
 * it matters: interpolating linearly instead agrees with the source only at
 * the two ends and the midpoint, and is visibly out everywhere between.
 *
 * Solved by Newton, falling back to bisection where the curve is flat.
 */
export function brandEase(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const x1 = 0.167;
  const x2 = 0.833;

  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;

  const at = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);

  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const d = slope(t, x1, x2);
    if (Math.abs(d) < 1e-6) break;
    t -= (at(t, x1, x2) - x) / d;
  }

  if (Math.abs(at(t, x1, x2) - x) > 1e-6) {
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30 && hi - lo > 1e-9; i += 1) {
      if (at(t, x1, x2) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
  }

  // The curve is symmetric, so the y control points are the x ones swapped.
  return at(t, 0.167, 0.833);
}

/** One ride across, in seconds — the composition's 60 frames at 29.97fps. */
export const RIDE_SECONDS = 2.002;
