/**
 * The rider loading scene, generated from the supplied Lottie file.
 *
 * DO NOT HAND-EDIT. Every number here was read out of `Rider.json`; the file
 * exists so the app can draw that animation without shipping a Lottie player
 * for it. The player is 45 KB gzipped, and a loading animation that first has
 * to load 45 KB of code to draw itself is working against its own job.
 *
 * WHAT IS STORED. Each layer's transform in the composition's own coordinate
 * space, exactly as Lottie models it: position, anchor, scale, rotation, and
 * the index of the layer it is parented to. Lottie composes a layer as
 *
 *     translate(position) · rotate · scale · translate(-anchor)
 *
 * with the parent's own composed matrix applied first, and that is what the
 * component reproduces. Layers are listed bottom to top, which is the reverse
 * of the Lottie array — Lottie stacks its first layer on top, SVG paints its
 * last element on top.
 *
 * EASING. Every keyframe in the source uses the same After Effects "easy ease"
 * handles, out (0.333, 0) and in (0.667, 1), so one cubic bezier covers the
 * whole animation rather than a curve per keyframe.
 *
 * The two long tracks — the bike's travel and the wheel rotation — are baked at
 * one key per frame in the source, so they are read linearly. They are also the
 * same numbers: the wheels turn by however far the bike has moved, which is why
 * it reads as rolling rather than sliding.
 */

export const SCENE = { width: 751, height: 437, frames: 120, fps: 30 };

/** The composition sits inside the viewBox under this transform. */
export const ROOT = { position: [375.5, 228.5], anchor: [821, 440], scale: 0.61 };

export const EASE = [0.333, 0, 0.667, 1];

export const LAYERS = [
  {
    ind: 13, name: "shadow", parent: 3,
    anchor: [224.233, 3.094],
    position: [-895.599, 4302.643],
    scale: [13.094, 13.909],
    rotation: 0,
  },
  {
    ind: 12, name: "break", parent: 3,
    sprite: "brake",
    anchor: [6.66, 6.698],
    position: [-1476.089, 3801.814],
    scale: [6.667, 6.667],
    rotationKeys: [[26, 0], [30, 21], [50, 21], [70, 0]],
  },
  {
    ind: 11, name: "tyre frnt", parent: 3,
    sprite: "tyreFront",
    anchor: [132.023, 132.013],
    position: [1036.747, 3383.955],
    scale: [6.667, 6.667],
    rotationKeys: [[0, -303], [1, -301.981], [2, -298.728], [3, -292.905], [4, -284.106], [5, -271.847], [6, -255.549], [7, -234.54], [8, -208.072], [9, -175.382], [10, -135.846], [11, -89.239], [12, -36.078], [13, 22.146], [14, 83.124], [15, 144.314], [16, 203.599], [17, 259.619], [18, 311.723], [19, 359.758], [20, 403.856], [21, 444.285], [22, 481.361], [23, 515.402], [24, 546.706], [25, 575.544], [26, 602.155], [27, 626.75], [28, 649.516], [29, 670.616], [30, 690.192], [31, 708.371], [32, 725.264], [33, 740.969], [34, 755.575], [35, 769.158], [36, 781.791], [37, 793.535], [38, 804.447], [39, 814.579], [40, 823.977], [41, 832.683], [42, 840.737], [43, 848.173], [44, 855.024], [45, 861.32], [46, 867.089], [47, 872.355], [48, 877.142], [49, 881.472], [50, 885.366], [51, 888.842], [52, 891.918], [53, 894.611], [54, 896.935], [55, 898.905], [56, 900.535], [57, 901.837], [58, 902.824], [59, 903.506]],
  },
  {
    ind: 10, name: "tyre back", parent: 3,
    sprite: "tyreBack",
    anchor: [132.023, 132.013],
    position: [-2517.361, 3383.955],
    scale: [6.667, 6.667],
    rotationKeys: [[0, -303], [1, -301.981], [2, -298.728], [3, -292.905], [4, -284.106], [5, -271.847], [6, -255.549], [7, -234.54], [8, -208.072], [9, -175.382], [10, -135.846], [11, -89.239], [12, -36.078], [13, 22.146], [14, 83.124], [15, 144.314], [16, 203.599], [17, 259.619], [18, 311.723], [19, 359.758], [20, 403.856], [21, 444.285], [22, 481.361], [23, 515.402], [24, 546.706], [25, 575.544], [26, 602.155], [27, 626.75], [28, 649.516], [29, 670.616], [30, 690.192], [31, 708.371], [32, 725.264], [33, 740.969], [34, 755.575], [35, 769.158], [36, 781.791], [37, 793.535], [38, 804.447], [39, 814.579], [40, 823.977], [41, 832.683], [42, 840.737], [43, 848.173], [44, 855.024], [45, 861.32], [46, 867.089], [47, 872.355], [48, 877.142], [49, 881.472], [50, 885.366], [51, 888.842], [52, 891.918], [53, 894.611], [54, 896.935], [55, 898.905], [56, 900.535], [57, 901.837], [58, 902.824], [59, 903.506]],
  },
  {
    ind: 9, name: "body", parent: 3,
    sprite: "body",
    anchor: [178.491, 488.82],
    position: [-2504.917, 3421.195],
    scale: [6.667, 6.667],
    rotationKeys: [[30, 0], [50, 2], [70, 0]],
  },
  {
    ind: 8, name: "fore leg", parent: 6,
    sprite: "foreLeg",
    anchor: [95.858, 25.596],
    position: [202.641, 97.054],
    scale: [1.0, 1.0],
    rotationKeys: [[80, 8], [100, -23]],
  },
  {
    ind: 7, name: "leg", parent: 8,
    sprite: "leg",
    anchor: [20.63, 36.692],
    position: [7.447, 228.455],
    scale: [1.0, 1.0],
    rotationKeys: [[26, -8], [30, 5], [50, 5], [70, -8], [90, -8], [100, -14]],
  },
  {
    ind: 6, name: "calf", parent: 9,
    sprite: "calf",
    anchor: [39.109, 37.226],
    position: [290.066, 261.494],
    scale: [1.0, 1.0],
    rotationKeys: [[80, 0], [100, 26]],
  },
  {
    ind: 5, name: "head", parent: 9,
    sprite: "head",
    anchor: [73.207, 82.359],
    position: [432.074, -14.744],
    scale: [1.0, 1.0],
    rotationKeys: [[30, 0], [50, 12], [70, 0]],
  },
  {
    ind: 4, name: "shock", parent: 3,
    sprite: "shock",
    anchor: [113.776, 101.429],
    position: [801.164, 3022.235],
    scale: [6.667, 6.667],
    rotation: 0,
  },
  {
    ind: 1, name: "Asset 1@4x.png", parent: 3,
    anchor: [231.5, 247],
    position: [-3404.724, 1788.102],
    scaleKeys: [[32, [0.146, 0.146]], [42, [0.999, 0.999]], [59, [0.999, 0.999]], [61, [0.146, 0.146]]],
    rotation: 0,
  },
  // Not drawn: the null the whole bike hangs off, and the track that
  // carries it in from the left and lets it settle.
  {
    ind: 3, name: "main", parent: null, anchor: [0, 0],
    positionX: [[0, -303], [1, -301.981], [2, -298.728], [3, -292.905], [4, -284.106], [5, -271.847], [6, -255.549], [7, -234.54], [8, -208.072], [9, -175.382], [10, -135.846], [11, -89.239], [12, -36.078], [13, 22.146], [14, 83.124], [15, 144.314], [16, 203.599], [17, 259.619], [18, 311.723], [19, 359.758], [20, 403.856], [21, 444.285], [22, 481.361], [23, 515.402], [24, 546.706], [25, 575.544], [26, 602.155], [27, 626.75], [28, 649.516], [29, 670.616], [30, 690.192], [31, 708.371], [32, 725.264], [33, 740.969], [34, 755.575], [35, 769.158], [36, 781.791], [37, 793.535], [38, 804.447], [39, 814.579], [40, 823.977], [41, 832.683], [42, 840.737], [43, 848.173], [44, 855.024], [45, 861.32], [46, 867.089], [47, 872.355], [48, 877.142], [49, 881.472], [50, 885.366], [51, 888.842], [52, 891.918], [53, 894.611], [54, 896.935], [55, 898.905], [56, 900.535], [57, 901.837], [58, 902.824], [59, 903.506]], positionY: 239,
    scale: [0.11, 0.11], rotation: 0, hidden: true,
  },
];
