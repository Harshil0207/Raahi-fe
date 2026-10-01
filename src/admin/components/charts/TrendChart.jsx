import { formatChartDay } from '@/admin/utils/format';
import { EmptyState } from '@/admin/components/ui/misc';
import { BarChart3 } from 'lucide-react';
import { ChartTooltip, Grid, Legend, Plot } from './chart-lib';
import { linePath, niceMax, ticksFor, useBars, useHoverIndex } from './chart-math';

/**
 * Daily counts as bars.
 *
 * One series, so no legend — the card title names it. Every day the backend
 * returned is drawn, including the empty ones, because dropping them would make
 * a quiet week look like a busy one.
 */
export function DailyBarChart({ days, valueKey = 'rides', label = 'rides', height = 160, format }) {
  const values = days.map((day) => day[valueKey] || 0);
  const max = niceMax(Math.max(...values, 0));
  const bars = useBars(days.length);
  const hover = useHoverIndex(days.length);

  if (!days.length) return <EmptyState icon={BarChart3} title="No data in this range" />;

  const active = hover.index != null ? days[hover.index] : null;

  return (
    <div className="relative">
      <Plot
        height={height}
        startLabel={formatChartDay(days[0]?.date)}
        endLabel={formatChartDay(days[days.length - 1]?.date)}
        hover={hover}
      >
        <Grid ticks={ticksFor(max)} max={max} format={format} />

        <div className="absolute inset-0 left-10">
          {days.map((day, i) => {
            const value = day[valueKey] || 0;
            const isActive = hover.index === i;

            return (
              <div
                key={day.date}
                className="absolute bottom-0 top-0"
                style={{ left: `${bars.left(i)}%`, width: `${bars.width}%` }}
              >
                {/* An empty day still renders a track, so the spacing is real time. */}
                <span
                  className="absolute bottom-0 w-full rounded-t-[3px]"
                  style={{ height: 3, background: 'var(--chart-track)' }}
                  aria-hidden
                />
                {value > 0 && (
                  <span
                    className="absolute bottom-0 w-full rounded-t-[4px] transition-[filter]"
                    style={{
                      height: `${bars.heightPercent(value, max)}%`,
                      background: 'var(--chart-series-1)',
                      filter: isActive ? 'brightness(1.15)' : undefined
                    }}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* One accessible summary rather than a label on every bar. */}
        <span className="sr-only">
          {`${label} per day from ${formatChartDay(days[0]?.date)} to ${formatChartDay(
            days[days.length - 1]?.date
          )}. Highest ${Math.max(...values)}.`}
        </span>
      </Plot>

      <div className="absolute inset-x-10 top-0">
        <ChartTooltip index={hover.index} count={days.length}>
          {active && (
            <>
              <p className="font-medium text-body">{formatChartDay(active.date)}</p>
              <p className="tabular text-muted">
                {format ? format(active[valueKey] || 0) : active[valueKey] || 0} {label}
              </p>
            </>
          )}
        </ChartTooltip>
      </div>
    </div>
  );
}

/**
 * Completed against cancelled, stacked.
 *
 * A status pairing rather than two arbitrary categories, so it is green against
 * grey — and it carries a legend and a hover readout, because the brief's rule
 * and plain sense both say identity must not rest on colour alone.
 */
export function CompletionChart({ days, height = 160 }) {
  const totals = days.map((day) => (day.completed || 0) + (day.cancelled || 0));
  const max = niceMax(Math.max(...totals, 0));
  const bars = useBars(days.length);
  const hover = useHoverIndex(days.length);

  if (!days.length) return <EmptyState icon={BarChart3} title="No data in this range" />;

  const active = hover.index != null ? days[hover.index] : null;
  const completed = days.reduce((sum, day) => sum + (day.completed || 0), 0);
  const cancelled = days.reduce((sum, day) => sum + (day.cancelled || 0), 0);

  return (
    <div>
      <Legend
        className="mb-3"
        items={[
          { label: 'Completed', color: 'var(--chart-positive)', value: completed },
          { label: 'Cancelled', color: 'var(--chart-neutral)', value: cancelled }
        ]}
      />

      <div className="relative">
        <Plot
          height={height}
          startLabel={formatChartDay(days[0]?.date)}
          endLabel={formatChartDay(days[days.length - 1]?.date)}
          hover={hover}
        >
          <Grid ticks={ticksFor(max)} max={max} />

          <div className="absolute inset-0 left-10">
            {days.map((day, i) => {
              const done = day.completed || 0;
              const cancel = day.cancelled || 0;
              const donePercent = bars.heightPercent(done, max);
              const cancelPercent = bars.heightPercent(cancel, max);
              const isActive = hover.index === i;

              return (
                <div
                  key={day.date}
                  className="absolute bottom-0 top-0"
                  style={{ left: `${bars.left(i)}%`, width: `${bars.width}%` }}
                >
                  <span
                    className="absolute bottom-0 w-full rounded-t-[3px]"
                    style={{ height: 3, background: 'var(--chart-track)' }}
                    aria-hidden
                  />
                  {done > 0 && (
                    <span
                      className="absolute bottom-0 w-full"
                      style={{
                        height: `${donePercent}%`,
                        background: 'var(--chart-positive)',
                        borderRadius: cancel > 0 ? '0 0 0 0' : '4px 4px 0 0',
                        filter: isActive ? 'brightness(1.12)' : undefined
                      }}
                      aria-hidden
                    />
                  )}
                  {cancel > 0 && (
                    <span
                      className="absolute w-full rounded-t-[4px]"
                      style={{
                        // A 2px surface gap between the two segments, so the
                        // boundary is visible without a stroke.
                        bottom: `calc(${donePercent}% + ${done > 0 ? 2 : 0}px)`,
                        height: `${cancelPercent}%`,
                        background: 'var(--chart-neutral)',
                        filter: isActive ? 'brightness(1.12)' : undefined
                      }}
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>

          <span className="sr-only">
            {`Completed and cancelled rides per day. ${completed} completed, ${cancelled} cancelled in this range.`}
          </span>
        </Plot>

        <div className="absolute inset-x-10 top-0">
          <ChartTooltip index={hover.index} count={days.length}>
            {active && (
              <>
                <p className="font-medium text-body">{formatChartDay(active.date)}</p>
                <p className="tabular text-muted">
                  <span style={{ color: 'var(--chart-positive)' }}>{active.completed || 0}</span> completed ·{' '}
                  <span style={{ color: 'var(--chart-neutral)' }}>{active.cancelled || 0}</span> cancelled
                </p>
              </>
            )}
          </ChartTooltip>
        </div>
      </div>
    </div>
  );
}

/**
 * Revenue over time as a line with a soft area under it.
 *
 * A line rather than bars because revenue is a continuous quantity people read
 * as a trend, where a ride count is a set of discrete events.
 */
export function RevenueChart({ days, currency = 'INR', height = 160, valueKey = 'revenue', format }) {
  const values = days.map((day) => day[valueKey] || 0);
  const max = niceMax(Math.max(...values, 0));
  const { line, area } = linePath(values, max);
  const hover = useHoverIndex(days.length);

  if (!days.length) return <EmptyState icon={BarChart3} title="No data in this range" />;

  const active = hover.index != null ? days[hover.index] : null;
  const step = days.length > 1 ? 100 / (days.length - 1) : 0;

  return (
    <div className="relative">
      <Plot
        height={height}
        startLabel={formatChartDay(days[0]?.date)}
        endLabel={formatChartDay(days[days.length - 1]?.date)}
        hover={hover}
      >
        <Grid ticks={ticksFor(max)} max={max} format={format} />

        <div className="absolute inset-0 left-10">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            aria-hidden
          >
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-series-1)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--chart-series-1)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path d={area} fill="url(#revenue-fill)" />
            <path
              d={line}
              fill="none"
              stroke="var(--chart-series-1)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              // The viewBox is stretched, so the stroke has to opt out of it or
              // it would be squashed along with the geometry.
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Crosshair and the point being read. */}
          {hover.index != null && (
            <>
              <span
                className="pointer-events-none absolute inset-y-0 w-px"
                style={{ left: `${hover.index * step}%`, background: 'var(--border-strong)' }}
                aria-hidden
              />
              <span
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full"
                style={{
                  left: `${hover.index * step}%`,
                  bottom: `${max > 0 ? ((values[hover.index] || 0) / max) * 100 : 0}%`,
                  background: 'var(--chart-series-1)',
                  // A 2px surface ring, so the marker reads against the fill.
                  boxShadow: '0 0 0 2px var(--surface)'
                }}
                aria-hidden
              />
            </>
          )}
        </div>

        <span className="sr-only">
          {`Revenue per day. Highest ${format ? format(Math.max(...values)) : Math.max(...values)} ${currency}.`}
        </span>
      </Plot>

      <div className="absolute inset-x-10 top-0">
        <ChartTooltip index={hover.index} count={days.length}>
          {active && (
            <>
              <p className="font-medium text-body">{formatChartDay(active.date)}</p>
              <p className="tabular text-muted">
                {format ? format(active[valueKey] || 0) : active[valueKey] || 0}
              </p>
            </>
          )}
        </ChartTooltip>
      </div>
    </div>
  );
}

/**
 * Two counts per day, side by side — new customers and new riders.
 *
 * Side by side rather than stacked, because the question is which is growing
 * faster, and a stack makes the upper series impossible to compare.
 */
export function GrowthChart({ days, height = 160 }) {
  const max = niceMax(Math.max(...days.flatMap((day) => [day.newCustomers || 0, day.newRiders || 0]), 0));
  const hover = useHoverIndex(days.length);

  if (!days.length) return <EmptyState icon={BarChart3} title="No data in this range" />;

  const slot = 100 / Math.max(days.length, 1);
  // Two bars in each slot with a 2px gap between them.
  const width = Math.min(slot * 0.3, 7);
  const active = hover.index != null ? days[hover.index] : null;

  const customers = days.reduce((sum, day) => sum + (day.newCustomers || 0), 0);
  const riders = days.reduce((sum, day) => sum + (day.newRiders || 0), 0);

  return (
    <div>
      <Legend
        className="mb-3"
        items={[
          { label: 'Customers', color: 'var(--chart-series-1)', value: customers },
          { label: 'Riders', color: 'var(--chart-series-2)', value: riders }
        ]}
      />

      <div className="relative">
        <Plot
          height={height}
          startLabel={formatChartDay(days[0]?.date)}
          endLabel={formatChartDay(days[days.length - 1]?.date)}
          hover={hover}
        >
          <Grid ticks={ticksFor(max)} max={max} />

          <div className="absolute inset-0 left-10">
            {days.map((day, i) => {
              const base = i * slot + (slot - width * 2 - 1) / 2;

              return (
                <div key={day.date}>
                  {[
                    { value: day.newCustomers || 0, color: 'var(--chart-series-1)', offset: 0 },
                    { value: day.newRiders || 0, color: 'var(--chart-series-2)', offset: width + 1 }
                  ].map((series) => (
                    <span
                      key={series.color}
                      className="absolute bottom-0 rounded-t-[3px]"
                      style={{
                        left: `${base + series.offset}%`,
                        width: `${width}%`,
                        height: series.value > 0 ? `${Math.max((series.value / max) * 100, 2)}%` : 3,
                        background: series.value > 0 ? series.color : 'var(--chart-track)',
                        filter: hover.index === i && series.value > 0 ? 'brightness(1.12)' : undefined
                      }}
                      aria-hidden
                    />
                  ))}
                </div>
              );
            })}
          </div>

          <span className="sr-only">
            {`New signups per day: ${customers} customers and ${riders} riders in this range.`}
          </span>
        </Plot>

        <div className="absolute inset-x-10 top-0">
          <ChartTooltip index={hover.index} count={days.length}>
            {active && (
              <>
                <p className="font-medium text-body">{formatChartDay(active.date)}</p>
                <p className="tabular text-muted">
                  {active.newCustomers || 0} customers · {active.newRiders || 0} riders
                </p>
              </>
            )}
          </ChartTooltip>
        </div>
      </div>
    </div>
  );
}

/**
 * The cash/UPI split as one horizontal bar.
 *
 * Two proportions of a whole, which a bar shows more precisely than a donut —
 * people misjudge angles and read lengths accurately. Each segment is labelled
 * with its own figure, so the reading does not depend on the colours at all.
 */
export function SplitBar({ segments, total, format = (v) => v, className }) {
  const sum = total ?? segments.reduce((acc, segment) => acc + segment.value, 0);

  if (!sum) {
    return (
      <p className={className}>
        <span className="text-[13px] text-muted">Nothing collected in this range.</span>
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((segment) => (
          <span
            key={segment.label}
            style={{
              width: `${(segment.value / sum) * 100}%`,
              background: segment.color,
              minWidth: segment.value > 0 ? 3 : 0
            }}
            aria-hidden
          />
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex items-center gap-2 text-muted">
              <span className="size-2 rounded-[2px]" style={{ background: segment.color }} aria-hidden />
              {segment.label}
            </span>
            <span className="tabular font-medium text-body">
              {format(segment.value)}
              <span className="ml-1.5 text-[11.5px] font-normal text-faint">
                {Math.round((segment.value / sum) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
