import { cn } from '@/lib/utils';

/**
 * A figure inside a card, where a bordered tile would be one box too many.
 *
 * `break-words` rather than a truncate, for the same reason MetricTile does it:
 * a clipped amount reads as a smaller one, which is the single failure mode a
 * money figure must not have.
 */
export function Figure({ label, value, hint, tone, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 break-words text-[15px] font-medium',
          tone === 'danger' && 'text-[var(--danger)]',
          tone === 'warning' && 'text-[var(--warning)]',
          tone === 'success' && 'text-[var(--success)]',
          !tone && 'text-body'
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11.5px] text-muted">{hint}</p>}
    </div>
  );
}
