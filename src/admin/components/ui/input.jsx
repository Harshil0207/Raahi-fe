import { useId } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

/** Form inputs, sized for a dense console rather than a phone. */

export function Input({ className, invalid, ...props }) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-[var(--radius-field)] border border-firm bg-surface px-2.5 text-[13.5px] text-body',
        'transition-colors placeholder:text-faint focus:border-[var(--accent)] focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid && 'border-[var(--danger)]',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'w-full resize-y rounded-[var(--radius-field)] border border-firm bg-surface px-2.5 py-2 text-[13.5px] text-body',
        'transition-colors placeholder:text-faint focus:border-[var(--accent)] focus:outline-none',
        invalid && 'border-[var(--danger)]',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

/**
 * A native select rather than a styled listbox.
 *
 * On a console this is the right call: it is keyboard-navigable for free, it
 * opens instantly, and an operator filtering a table does not want an animated
 * dropdown.
 */
export function Select({ className, children, invalid, ...props }) {
  return (
    <select
      className={cn(
        'h-9 w-full appearance-none rounded-[var(--radius-field)] border border-firm bg-surface px-2.5 pr-7 text-[13.5px] text-body',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'none\' stroke=\'%238e99a9\' stroke-width=\'1.5\'%3E%3Cpath d=\'M4 6l4 4 4-4\'/%3E%3C/svg%3E")] bg-[length:14px] bg-[position:right_0.5rem_center] bg-no-repeat',
        'transition-colors focus:border-[var(--accent)] focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid && 'border-[var(--danger)]',
        className
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Label, control and error, wired together by id.
 *
 * `children` is a render function so the generated id and aria attributes reach
 * the control without every caller repeating them.
 */
export function Field({ label, error, hint, required, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <LabelPrimitive.Root htmlFor={id} className="block text-[12.5px] font-medium text-body">
          {label}
          {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
        </LabelPrimitive.Root>
      )}

      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-[var(--danger)]">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[12px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
