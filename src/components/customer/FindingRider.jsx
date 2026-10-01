import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Radar sweep for the search state. It is decoration, not data — the ride only
 * leaves this state when the server says a rider accepted.
 */
export function FindingRider({ ridersNotified }) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="flex items-center gap-4">
      <div className="relative grid size-14 shrink-0 place-items-center">
        {!reduced &&
          [0, 0.6, 1.2].map((delay) => (
            <motion.span
              key={delay}
              className="absolute rounded-full border border-[var(--accent)]"
              initial={{ width: 16, height: 16, opacity: 0.8 }}
              animate={{ width: 56, height: 56, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeOut' }}
            />
          ))}
        <span className="size-3 rounded-full bg-[var(--accent)]" />
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-body">Finding your rider</p>
        <p className="text-sm text-muted">
          {ridersNotified > 0
            ? `${ridersNotified} rider${ridersNotified > 1 ? 's' : ''} nearby have been asked.`
            : 'Looking for riders near your pickup point.'}
        </p>
      </div>
    </div>
  );
}
