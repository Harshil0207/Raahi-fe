import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistance, formatDuration, formatMoney } from '@/utils/format';

/**
 * The fare is the number people look at first, so it gets the largest type on
 * the screen. Every figure here comes from the server — nothing is computed
 * client-side.
 */
export function FareSummary({ fare, currency = 'INR', distanceKm, durationMin, label = 'Estimated fare', className, emphasis = true }) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <motion.p
          key={fare}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={cn('tabular font-semibold text-body', emphasis ? 'text-4xl' : 'text-2xl')}
        >
          {formatMoney(fare, currency)}
        </motion.p>
      </div>

      <div className="shrink-0 text-right text-sm text-muted">
        <p className="tabular">{formatDistance(distanceKm)}</p>
        {durationMin != null && <p className="tabular text-muted">{formatDuration(durationMin)}</p>}
      </div>
    </div>
  );
}
