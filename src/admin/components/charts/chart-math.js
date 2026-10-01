/**
 * Chart maths and geometry. No JSX, so the component file next door can export
 * only components and stay hot-reloadable.
 *
 * Shared decisions, in one place so the six charts agree:
 *  - colours come from `--chart-*`, which are picked per mode and validated for
 *    contrast and colour-vision separation rather than flipped between themes
 *  - grid and axes are recessive; the data is the only thing with weight
 *  - every chart has a hover layer, because a chart on a screen that cannot be
 *    interrogated is a picture of data
 *  - two series always get a legend, so identity is never carried by colour alone
 */
import { useCallback, useMemo, useState } from 'react';

/** Width of the axis-label gutter. The plot starts here, and so does hover. */
export const GUTTER = 40;

/** A y scale that ends on a round number, so the axis reads 0 / 50 / 100. */
export function niceMax(value) {
  if (!value || value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;

  return step * magnitude;
}

/**
 * Ticks for the gridlines, always including 0 and the top.
 *
 * A count axis whose highest value is 1 or 2 cannot carry four gridlines: the
 * fractions round to the same integer and the axis reads "1 1 0 0". Where the
 * scale is small and whole, the ticks are the whole numbers themselves.
 */
export function ticksFor(max, count = 3) {
  if (!(max > 0)) return [0];

  // A count axis wants whole, evenly spaced gridlines. Dividing the top by
  // three gives 0 / 1.67 / 3.33 / 5, which rounds to "0 2 3 5" — uneven steps
  // that make the same gap look like two different sizes. Below a small
  // threshold the step is chosen from 1, 2, 5 instead.
  if (Number.isInteger(max) && max <= 20) {
    // The step has to divide the top exactly, or the last gap is a different
    // size from the rest and the axis lies about its own spacing.
    let step = max;
    for (let candidate = 1; candidate <= max; candidate += 1) {
      if (max % candidate === 0 && max / candidate <= count + 1) {
        step = candidate;
        break;
      }
    }

    const ticks = [];
    for (let value = 0; value <= max; value += step) ticks.push(value);
    return ticks;
  }

  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

/**
 * Tracks which index the pointer is over.
 *
 * Index-based rather than nearest-point: on a daily series the pointer is
 * always inside one day's column, and that is the value someone means.
 *
 * The element is measured from the event rather than through a ref, so the
 * rectangle is always the one the pointer actually moved over — a ref and a
 * listener can drift apart, `currentTarget` cannot.
 */
export function useHoverIndex(count) {
  const [index, setIndex] = useState(null);

  const onMove = useCallback(
    (event) => {
      if (!count) return;

      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width) return;

      const ratio = (event.clientX - rect.left) / rect.width;
      setIndex(Math.max(0, Math.min(count - 1, Math.floor(ratio * count))));
    },
    [count]
  );

  const onLeave = useCallback(() => setIndex(null), []);

  return { index, setIndex, onMove, onLeave };
}

/**
 * Turns a series into an SVG path, plus the same path closed for an area fill.
 *
 * `viewBox` is 0 0 100 100 with `preserveAspectRatio="none"`, so the chart
 * stretches to whatever width the card gives it without recomputing anything.
 */
export function linePath(values, max) {
  if (!values.length) return { line: '', area: '' };

  const y = (value) => 100 - (max > 0 ? (value / max) * 100 : 0);

  // One day selected is one point. Joined to the baseline it draws a wedge
  // sloping to zero, which reads as a collapse that never happened — so a
  // single value is held flat across the plot instead.
  if (values.length === 1) {
    const level = y(values[0]);
    return {
      line: `M 0,${level} L 100,${level}`,
      area: `M 0,100 L 0,${level} L 100,${level} L 100,100 Z`
    };
  }

  const step = 100 / (values.length - 1);
  const points = values.map((value, i) => `${i * step},${y(value)}`);

  return {
    line: `M ${points.join(' L ')}`,
    area: `M 0,100 L ${points.join(' L ')} L 100,100 Z`
  };
}

/** Bar geometry with a 2px gap between neighbours, as the mark spec requires. */
export function useBars(count, { minHeightPercent = 2 } = {}) {
  return useMemo(() => {
    const slot = 100 / Math.max(count, 1);
    // Wide bars for a short series, thin for a long one, never wider than 60%.
    const width = Math.min(slot * 0.62, 12);

    return {
      slot,
      width,
      left: (i) => i * slot + (slot - width) / 2,
      heightPercent: (value, max) => (value > 0 ? Math.max((value / max) * 100, minHeightPercent) : 0)
    };
  }, [count, minHeightPercent]);
}
