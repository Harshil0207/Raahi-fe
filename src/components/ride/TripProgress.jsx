import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RIDE_STATUS, TRIP_STEPS } from '@/constants/ride';

// Where each status sits on the rail. ARRIVING and OTP_VERIFIED share a stop
// with the step before them rather than adding a tick nobody waits on.
const STEP_INDEX = {
  [RIDE_STATUS.SEARCHING]: -1,
  [RIDE_STATUS.ACCEPTED]: 0,
  [RIDE_STATUS.ARRIVING]: 0,
  [RIDE_STATUS.ARRIVED]: 1,
  [RIDE_STATUS.OTP_VERIFIED]: 1,
  [RIDE_STATUS.IN_PROGRESS]: 2,
  [RIDE_STATUS.COMPLETED]: 3
};

export function TripProgress({ status, className }) {
  const current = STEP_INDEX[status] ?? -1;

  return (
    <ol className={cn('flex items-center gap-1.5', className)} aria-label="Trip progress">
      {TRIP_STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.key} className="flex flex-1 flex-col gap-1.5">
            <span className="h-1 overflow-hidden rounded-full bg-[var(--border)]">
              <motion.span
                className="block h-full rounded-full bg-[var(--accent)]"
                initial={false}
                animate={{ width: done ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span
              className={cn(
                'text-[10px] font-medium transition-colors',
                done ? 'text-body' : 'text-muted'
              )}
              aria-current={i === current ? 'step' : undefined}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
