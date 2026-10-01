import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/misc';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { OTP_LENGTH } from '@/constants/ride';

/**
 * The customer's copy of the pickup code. Read out to the rider, who types it
 * into their own app — it is never transmitted between the two devices.
 *
 * The code itself tells this component how many boxes to draw, which is how the
 * customer side handles the configurable `ride.otpLength` without being told
 * what it is. `length` only sizes the skeleton, before there is a code to count.
 */
export function OtpDisplay({ otp, loading, verified, length = OTP_LENGTH, className }) {
  const reduceMotion = usePrefersReducedMotion();

  if (verified) {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 24 }
        }
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-[var(--success-edge)] bg-[var(--success-wash)] p-4',
          className
        )}
      >
        <ShieldCheck className="size-5 shrink-0 text-[var(--success)]" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-body">Code verified</p>
          <p className="text-xs text-muted">Your trip is starting.</p>
        </div>
      </motion.div>
    );
  }

  const digits = otp ? String(otp).replace(/\D+/g, '') : '';
  const pending = loading || !digits;
  const boxes = digits.length || Math.min(Math.max(Math.trunc(Number(length)) || OTP_LENGTH, 4), 6);

  return (
    <div className={cn('rounded-2xl border border-hair bg-sunken p-4', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Share this code with your rider
      </p>

      <div
        className={cn('mt-2.5 flex', boxes > 4 ? 'gap-1.5' : 'gap-2')}
        role="group"
        aria-label={
          pending ? 'Pickup code, loading' : `Pickup code ${digits.split('').join(' ')}`
        }
      >
        {pending
          ? Array.from({ length: boxes }, (_, i) => (
              <Skeleton key={i} className="h-14 min-w-0 flex-1 rounded-xl" />
            ))
          : digits.split('').map((digit, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion ? { duration: 0 } : { delay: i * 0.05, duration: 0.25 }
                }
                className={cn(
                  'tabular grid h-14 min-w-0 flex-1 place-items-center rounded-xl border border-hair bg-elevated font-semibold text-body',
                  boxes > 4 ? 'text-xl' : 'text-2xl'
                )}
              >
                {digit}
              </motion.span>
            ))}
      </div>

      <p className="mt-2.5 text-xs text-muted">
        Only give it to the rider once they have arrived and you have checked the vehicle number.
      </p>
    </div>
  );
}
