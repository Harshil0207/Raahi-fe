import { useEffect, useRef } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The box you type into.
 *
 * Grows with the text up to a ceiling, then scrolls — a composer that keeps
 * growing eats the conversation it belongs to. Enter sends and Shift+Enter
 * breaks the line on a physical keyboard; on a phone the return key inserts a
 * newline and the button is how you send, which is why the button is always
 * there rather than appearing when the box has content.
 *
 * While an answer is arriving the send button becomes a stop button, so a long
 * answer can be cut short without closing the panel.
 */
export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  sending,
  disabled,
  maxLength,
  inputRef
}) {
  const internal = useRef(null);
  const area = inputRef || internal;

  // Height follows content: reset first, then measure, or it can only ever grow.
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [value, area]);

  const remaining = maxLength - value.length;
  // Silent until it matters, then counts down.
  const showCount = remaining <= 100;

  function submit(event) {
    event?.preventDefault();
    if (sending || disabled) return;
    onSubmit();
  }

  return (
    <form onSubmit={submit} className="border-t border-hair bg-elevated px-3 py-2.5 pb-safe">
      <div className="flex items-end gap-2">
        <textarea
          ref={area}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) submit(event);
          }}
          rows={1}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={disabled ? 'The assistant is unavailable' : 'Ask Raahi…'}
          aria-label="Ask the Raahi Assistant"
          className={cn(
            'max-h-[120px] min-h-11 flex-1 resize-none rounded-2xl border border-hair bg-sunken',
            'px-3.5 py-3 text-[15px] text-body outline-none placeholder:text-faint',
            'focus-visible:border-[var(--accent)] disabled:opacity-60'
          )}
        />

        {sending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop answering"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-hair bg-elevated text-muted transition-transform active:scale-95 hover:text-body"
          >
            <Square className="size-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            aria-label="Send"
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-full transition-all active:scale-95',
              'bg-[var(--accent)] text-[var(--accent-contrast)]',
              'disabled:pointer-events-none disabled:opacity-40'
            )}
          >
            <ArrowUp className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {showCount && (
        <p
          className={cn('tabular mt-1.5 px-1 text-right text-[11px]', remaining <= 0 ? 'text-[var(--danger)]' : 'text-faint')}
          aria-live="polite"
        >
          {remaining} characters left
        </p>
      )}
    </form>
  );
}
