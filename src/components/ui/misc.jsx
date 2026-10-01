import { useEffect, useRef, useState } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

const TONES = {
  neutral: 'bg-sunken text-muted',
  accent: 'bg-[var(--accent-wash)] text-accent',
  rider: 'bg-[var(--rider-wash)] text-[var(--rider-status)]',
  customer: 'bg-[var(--accent-wash)] text-[var(--customer-status)]',
  positive: 'bg-[var(--success-wash)] text-[var(--success)]',
  warning: 'bg-[var(--warning-wash)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-wash)] text-[var(--danger)]'
};

export function StatusBadge({ className, tone = 'neutral', dot = false, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        TONES[tone],
        className
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-xl bg-[var(--surface-sunken)]', className)} />;
}

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative h-8 w-14 shrink-0 cursor-pointer rounded-full border transition-colors',
        'data-[state=checked]:bg-[var(--accent)] data-[state=unchecked]:bg-[var(--surface-sunken)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-6 translate-x-1 rounded-full bg-white shadow transition-transform duration-200 data-[state=checked]:translate-x-[1.625rem]" />
    </SwitchPrimitive.Root>
  );
}

export function Separator({ className }) {
  return <div role="separator" className={cn('h-px w-full bg-[var(--border)]', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-sunken text-faint">
          <Icon className="size-6" />
        </div>
      )}
      <p className="font-semibold text-body">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-[var(--accent-wash)] px-4 py-2 text-sm font-medium text-accent"
          >
            Try again
          </button>
        )
      }
    />
  );
}

export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}

/**
 * Counts to a new value rather than snapping, which makes earnings read as
 * money accumulating. Jumps straight to the value under reduced motion, and
 * never animates the first paint — a number arriving from the server is not
 * a change the user made.
 */
export function AnimatedNumber({ value, format = (n) => n.toFixed(0), duration = 650, className }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      fromRef.current = value;
      setShown(value);
      return;
    }

    if (reduced) {
      fromRef.current = value;
      setShown(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const started = performance.now();
    let raf;

    const step = (now) => {
      const t = Math.min((now - started) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(from + delta * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return <span className={cn('tabular', className)}>{format(shown)}</span>;
}
