import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AnimatedNumber, Skeleton } from '@/admin/components/ui/misc';
import { cn } from '@/lib/utils';

/**
 * One figure with its name.
 *
 * Flat, no icon and no sparkline — a grid of sixteen decorated tiles is the
 * dashboard-clutter the brief rules out. The figure carries the weight; the
 * label sits under it in muted text; a tone appears only when the number means
 * something needs attention.
 *
 * `to` makes a tile a link, which is the main thing an operator does with a
 * figure that surprises them: go and look at what it is made of.
 */
export function MetricTile({
  label,
  value,
  hint,
  tone,
  to,
  loading = false,
  animate = false,
  format,
  className
}) {
  const body = (
    <>
      <p className="text-[11.5px] uppercase tracking-wide text-faint">{label}</p>

      {loading ? (
        <Skeleton className="mt-1.5 h-7 w-20" />
      ) : (
        <p
          className={cn(
            // `break-words` rather than a truncate: a clipped figure reads as
            // a smaller number, which is the one failure mode a money tile
            // must not have.
            'tabular mt-1 break-words text-[22px] font-semibold leading-none',
            tone === 'danger' && 'text-[var(--danger)]',
            tone === 'warning' && 'text-[var(--warning)]',
            tone === 'success' && 'text-[var(--success)]',
            !tone && 'text-body'
          )}
        >
          {animate && typeof value === 'number' ? <AnimatedNumber value={value} format={format} /> : value}
        </p>
      )}

      {hint && <p className="mt-1.5 text-[11.5px] text-muted">{hint}</p>}
    </>
  );

  const shell = cn(
    'rounded-[var(--radius-card)] border border-hair bg-surface p-3.5',
    to && 'group transition-colors hover:border-firm hover:bg-[var(--surface-hover)]',
    className
  );

  if (!to) return <div className={shell}>{body}</div>;

  return (
    <Link to={to} className={cn(shell, 'block')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{body}</div>
        <ArrowRight
          className="mt-0.5 size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  );
}
