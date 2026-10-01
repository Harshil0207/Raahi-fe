import { cn } from '@/lib/utils';

const SIZE = 64;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Ring driven by the fraction of the server's window still left. It turns amber
 * then red as the deadline approaches, which is the only cue the rider needs —
 * the number underneath is the same value in seconds.
 */
export function CountdownRing({ progress, seconds, className }) {
  const urgent = seconds <= 5;
  const warning = seconds <= 10;

  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden focusable="false">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-[var(--border)]"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className={cn(
            'transition-[stroke-dashoffset,stroke] duration-100 ease-linear',
            urgent ? 'stroke-[var(--danger)]' : warning ? 'stroke-[var(--warning)]' : 'stroke-[var(--accent)]'
          )}
        />
      </svg>

      <span
        className={cn(
          'tabular absolute text-xl font-semibold',
          urgent ? 'text-[var(--danger)]' : 'text-body'
        )}
        aria-live="off"
      >
        {seconds}
      </span>
    </div>
  );
}
