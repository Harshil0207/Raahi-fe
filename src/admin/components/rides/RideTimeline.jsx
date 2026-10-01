import { Check, CircleSlash, Clock } from 'lucide-react';
import { formatTime } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * The ride's progress, from the stamps the ride actually carries.
 *
 * A step with no timestamp is drawn as not reached rather than being given a
 * plausible time — the whole value of this on a disputed ride is that it shows
 * what the server recorded and nothing else.
 *
 * Vertical on a narrow screen, horizontal from `md`: the same eight steps, but
 * a horizontal rail at 390px would put four characters under each dot.
 */
export function RideTimeline({ timeline }) {
  if (!timeline?.length) return null;

  return (
    <>
      {/* Narrow: a vertical rail. */}
      <ol className="md:hidden">
        {timeline.map((step, index) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Dot step={step} />
              {index < timeline.length - 1 && (
                <span
                  className={cn('w-px flex-1', step.reached ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}
                  style={{ minHeight: 18 }}
                />
              )}
            </div>
            <div className={cn('pb-3', index === timeline.length - 1 && 'pb-0')}>
              <p className={cn('text-[13px]', step.reached ? 'font-medium text-body' : 'text-faint')}>
                {step.label}
              </p>
              <p className="tabular text-[11.5px] text-muted">{step.at ? formatTime(step.at) : 'Not reached'}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Wide: a horizontal rail. */}
      <ol className="hidden md:flex md:items-start">
        {timeline.map((step, index) => (
          <li key={step.key} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {index > 0 && (
              <span
                className={cn(
                  'absolute left-0 top-[11px] h-px w-1/2 -translate-y-1/2',
                  step.reached ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                )}
                aria-hidden
              />
            )}
            {index < timeline.length - 1 && (
              <span
                className={cn(
                  'absolute right-0 top-[11px] h-px w-1/2 -translate-y-1/2',
                  timeline[index + 1].reached ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                )}
                aria-hidden
              />
            )}

            <Dot step={step} />

            <p
              className={cn(
                'mt-1.5 px-1 text-[11.5px] leading-tight',
                step.reached ? 'font-medium text-body' : 'text-faint'
              )}
            >
              {step.label}
            </p>
            <p className="tabular text-[10.5px] text-muted">{step.at ? formatTime(step.at) : '—'}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function Dot({ step }) {
  const Icon = step.terminal ? CircleSlash : step.reached ? Check : Clock;

  return (
    <span
      className={cn(
        'relative z-10 grid size-[22px] shrink-0 place-items-center rounded-full border-2',
        step.terminal
          ? 'border-[var(--danger)] bg-[var(--danger-wash)] text-[var(--danger)]'
          : step.reached
            ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
            : 'border-[var(--border)] bg-surface text-faint'
      )}
    >
      <Icon className="size-3" aria-hidden />
    </span>
  );
}
