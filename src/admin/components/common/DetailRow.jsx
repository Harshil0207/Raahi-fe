import { cn } from '@/lib/utils';

/**
 * A label and its value, the unit every detail page is built from.
 *
 * Stacked on a narrow screen and two columns from `sm`, so a long address wraps
 * under its label instead of squeezing into a third of the width.
 */
export function DetailRow({ label, children, className, mono = false }) {
  return (
    <div className={cn('py-2 sm:grid sm:grid-cols-[minmax(7rem,9rem)_1fr] sm:gap-4', className)}>
      <dt className="text-[12px] text-muted">{label}</dt>
      {/* `min-w-0` alone does not wrap an unbroken string — a gateway order id
          has no spaces in it, and used to run off the edge of the card. */}
      <dd className={cn('mt-0.5 min-w-0 break-words text-[13px] text-body sm:mt-0', mono && 'mono break-all')}>
        {children ?? <span className="text-faint">—</span>}
      </dd>
    </div>
  );
}

export function DetailList({ children, className }) {
  return <dl className={cn('divide-y divide-[var(--border)]', className)}>{children}</dl>;
}
