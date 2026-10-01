import { cn } from '@/lib/utils';
import { shortAddress } from '@/utils/format';

const DEFAULT_LABELS = { pickup: 'Pickup', destination: 'Destination' };

/**
 * Pickup above destination, joined by a rail — the hierarchy every ride app
 * uses, because it reads as a journey rather than two unrelated fields.
 *
 * `labels` exists for deliveries, where the two ends are a collection and a
 * drop rather than a passenger getting in and out.
 */
export function RoutePreview({
  pickup,
  destination,
  className,
  compact = false,
  labels = DEFAULT_LABELS
}) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex flex-col items-center pt-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-[var(--accent)]" />
        <span className="my-1 w-px flex-1 bg-[var(--border)]" />
        <span className="size-2.5 rounded-[3px] bg-[var(--text)]" />
      </div>

      <div className={cn('min-w-0 flex-1', compact ? 'space-y-2' : 'space-y-3.5')}>
        <Line label={labels.pickup} value={pickup} compact={compact} />
        <Line label={labels.destination} value={destination} compact={compact} />
      </div>
    </div>
  );
}

function Line({ label, value, compact }) {
  return (
    <div className="min-w-0">
      {!compact && <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>}
      <p className={cn('truncate text-body', compact ? 'text-sm' : 'text-[15px] font-medium')}>
        {value ? shortAddress(value, 3) : <span className="text-muted">Not set</span>}
      </p>
    </div>
  );
}
