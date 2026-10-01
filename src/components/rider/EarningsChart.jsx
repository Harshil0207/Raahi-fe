import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatMoney, plural } from '@/utils/format';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Daily earnings as a bar chart, drawn with plain SVG — a charting library would
 * be a large dependency for one chart with one series.
 *
 * Every bar is a real day returned by the backend, including days with nothing
 * earned; those render as an empty track rather than being dropped, so the
 * spacing reflects actual time rather than only the days that went well.
 */
export function EarningsChart({ data, currency = 'INR', className }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(null);

  const max = useMemo(() => Math.max(...data.map((d) => d.total), 1), [data]);
  const hasEarnings = data.some((d) => d.total > 0);

  const selected = active != null ? data[active] : null;
  const peak = useMemo(() => data.reduce((a, b) => (b.total > a.total ? b : a), data[0]), [data]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-faint">
            {selected ? formatDay(selected.date, true) : `Last ${data.length} days`}
          </p>
          <p className="tabular text-xl font-semibold text-body">
            {formatMoney(selected ? selected.total : data.reduce((s, d) => s + d.total, 0), currency)}
          </p>
        </div>
        {selected && (
          <p className="tabular text-sm text-muted">
            {plural(selected.trips, 'trip')}
          </p>
        )}
      </div>

      <div
        className="flex h-32 items-end gap-[3px]"
        role="img"
        aria-label={
          hasEarnings
            ? `Daily earnings for the last ${data.length} days. Best day ${formatDay(peak.date)} at ${formatMoney(peak.total, currency)}.`
            : 'No earnings recorded in this period.'
        }
      >
        {data.map((day, i) => {
          const height = day.total > 0 ? Math.max((day.total / max) * 100, 6) : 3;
          const isActive = active === i;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setActive(isActive ? null : i)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="group relative flex h-full flex-1 items-end"
              aria-label={`${formatDay(day.date, true)}: ${formatMoney(day.total, currency)}, ${plural(day.trips, 'trip')}`}
            >
              <motion.span
                initial={reduced ? false : { height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: reduced ? 0 : i * 0.015, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'w-full rounded-t-[3px] transition-colors',
                  day.total > 0
                    ? isActive
                      ? 'bg-[var(--accent)]'
                      : 'bg-[var(--accent)]/45 group-hover:bg-[var(--accent)]/70'
                    : 'bg-[var(--border)]'
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-faint">
        <span>{formatDay(data[0]?.date)}</span>
        <span>{formatDay(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function formatDay(iso, long = false) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
}
