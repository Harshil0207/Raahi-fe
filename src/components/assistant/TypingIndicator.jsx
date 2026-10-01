import { cn } from '@/lib/utils';

/**
 * Shown while the model is working, and removed the instant the first word
 * arrives — it is a sign that something is happening, not a performance of
 * typing. The system instruction asks for short answers, so this is usually on
 * screen for under a second.
 *
 * The animation is CSS rather than JS. A JS-driven indicator that gets stuck
 * mid-cycle leaves three dots frozen on screen looking like a hang, which is
 * the opposite of what it is for.
 */
export function TypingIndicator({ label = 'Raahi is thinking', className }) {
  return (
    <div className={cn('flex items-center gap-2', className)} role="status" aria-live="polite">
      <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-sunken px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="assistant-dot size-1.5 rounded-full bg-[var(--text-muted)]"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="text-[12.5px] text-faint">
        {label}…
      </span>
    </div>
  );
}
