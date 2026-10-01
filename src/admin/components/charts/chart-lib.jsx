import { cn } from '@/lib/utils';
import { GUTTER } from './chart-math';

/**
 * The pieces every chart on the console is built from.
 *
 * Hand-drawn SVG rather than a charting library: there are six small charts,
 * all of one series or two, and a library would be a large dependency and a
 * second theming system to keep in step with the CSS tokens.
 *
 * Shared decisions, in one place so the six charts agree:
 *  - colours come from `--chart-*`, which are picked per mode and validated for
 *    contrast and colour-vision separation rather than flipped between themes
 *  - grid and axes are recessive; the data is the only thing with weight
 *  - every chart has a hover layer, because a chart on a screen that cannot be
 *    interrogated is a picture of data
 *  - two series always get a legend, so identity is never carried by colour alone
 */

/**
 * The tooltip. Positioned as a percentage and flipped near the right edge, so
 * it never runs off a narrow card.
 */
export function ChartTooltip({ index, count, children }) {
  if (index == null || !count) return null;

  const ratio = (index + 0.5) / count;
  const flip = ratio > 0.62;

  return (
    <div
      className="pointer-events-none absolute top-0 z-10 w-max max-w-[14rem]"
      style={{
        left: `${ratio * 100}%`,
        transform: flip ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)'
      }}
    >
      <div className="rounded-[var(--radius-field)] border border-firm bg-elevated px-2.5 py-1.5 text-[12px] shadow-[var(--shadow-float)]">
        {children}
      </div>
    </div>
  );
}

/** A legend swatch plus its name. Present whenever there are two series. */
export function Legend({ items, className }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ background: item.color }} aria-hidden />
          {item.label}
          {item.value != null && <span className="tabular font-medium text-body">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Recessive horizontal gridlines with their values. */
export function Grid({ ticks, max, format = (v) => Math.round(v) }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {ticks.map((tick) => {
        const bottom = (tick / max) * 100;
        return (
          <div
            key={tick}
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ bottom: `${bottom}%`, height: 1 }}
          >
            <span className="tabular w-8 shrink-0 text-right text-[10px] leading-none text-faint">
              {format(tick)}
            </span>
            <span className="h-px flex-1" style={{ background: 'var(--chart-grid)' }} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * The outer frame: a fixed-height plot area with the first and last x labels,
 * and the hover surface.
 *
 * Only the ends are labelled — a daily chart over 30 days cannot fit 30 dates,
 * and hover is what answers "which day is that".
 *
 * The hover surface is a sibling overlay inset by the gutter rather than the
 * whole frame, because measuring the frame would include the 40px of axis
 * labels and shift every reading left by a day or two.
 */
export function Plot({ height = 160, startLabel, endLabel, hover, children, className }) {
  return (
    <div className={cn('select-none', className)}>
      <div className="relative" style={{ height }}>
        {children}

        {hover && (
          <div
            onPointerMove={hover.onMove}
            onPointerLeave={hover.onLeave}
            className="absolute inset-y-0 right-0"
            style={{ left: GUTTER }}
          />
        )}
      </div>

      {(startLabel || endLabel) && (
        <div className="mt-1.5 flex justify-between text-[10.5px] text-faint" style={{ paddingLeft: GUTTER }}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
  );
}
