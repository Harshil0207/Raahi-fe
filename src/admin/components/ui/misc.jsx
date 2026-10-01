import { useEffect, useRef, useState } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { AlertTriangle, Inbox, Loader2, RotateCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

/** Small pieces used across every screen. */

const TONES = {
  neutral: 'bg-sunken text-muted border-hair',
  accent: 'bg-[var(--accent-wash)] text-accent border-transparent',
  success: 'bg-[var(--success-wash)] text-[var(--success)] border-transparent',
  warning: 'bg-[var(--warning-wash)] text-[var(--warning)] border-transparent',
  danger: 'bg-[var(--danger-wash)] text-[var(--danger)] border-transparent',
  info: 'bg-[var(--info-wash)] text-[var(--info)] border-transparent'
};

export function Badge({ tone = 'neutral', children, className, dot = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium',
        TONES[tone] || TONES.neutral,
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** A live indicator that pulses only when something really is live. */
export function LiveDot({ active = true, className }) {
  return (
    <span className={cn('relative inline-flex size-2 shrink-0', className)}>
      {active && (
        <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[var(--success)] opacity-70" />
      )}
      <span
        className={cn(
          'relative inline-flex size-2 rounded-full',
          active ? 'bg-[var(--success)]' : 'bg-[var(--text-faint)]'
        )}
      />
    </span>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-hair bg-surface shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-hair px-4 py-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[13.5px] font-semibold text-body">{title}</h2>
        {description && <p className="mt-0.5 text-[12px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export const CardBody = ({ className, children }) => <div className={cn('p-4', className)}>{children}</div>;

export const Separator = ({ className, ...props }) => (
  <SeparatorPrimitive.Root className={cn('h-px w-full bg-[var(--border)]', className)} {...props} />
);

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors',
        'bg-[var(--border-strong)] data-[state=checked]:bg-[var(--accent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded bg-[var(--surface-hover)]', className)} />;
}

export function Spinner({ className }) {
  return <Loader2 className={cn('size-4 animate-spin text-muted', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-full bg-sunken text-faint">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-3 text-[14px] font-medium text-body">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Could not load this', description, onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-full bg-[var(--danger-wash)] text-[var(--danger)]">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <p className="mt-3 text-[14px] font-medium text-body">{title}</p>
      {description && <p className="mt-1 max-w-md text-[13px] text-muted">{description}</p>}
      {onRetry && (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Counts up to a new value rather than snapping.
 *
 * Only on the dashboard, and only after the first paint — a figure that animates
 * on load is a distraction, but one that visibly moves when a filter changes
 * makes it obvious the number responded.
 */
export function AnimatedNumber({ value = 0, format = (v) => Math.round(v).toLocaleString('en-IN'), duration = 420 }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      previous.current = value;
      setShown(value);
      return undefined;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previous.current = value;
      setShown(value);
      return undefined;
    }

    const from = previous.current;
    const delta = value - from;
    const startedAt = performance.now();
    let frame;

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      // Cubic ease-out: quick to most of the way, then settles.
      setShown(from + delta * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(step);
      else previous.current = value;
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="tabular">{format(shown)}</span>;
}

/** Copies an id to the clipboard — the console's most repeated small action. */
export function CopyId({ id, label = 'id', className }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard is blocked without a user gesture in some contexts; the id is
      // still on screen to select by hand.
    }
  }

  if (!id) return <span className="text-faint">—</span>;

  return (
    <button
      type="button"
      onClick={copy}
      title={String(id)}
      aria-label={`Copy ${label}`}
      className={cn('id-chip rounded px-1 py-0.5 transition-colors hover:bg-[var(--surface-hover)]', className)}
    >
      {copied ? 'copied' : `…${String(id).slice(-8)}`}
    </button>
  );
}
