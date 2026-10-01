import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-12 w-full rounded-2xl border border-hair bg-elevated px-4 text-[15px] text-body transition-colors',
        'placeholder:text-muted focus:border-[var(--accent)] focus:outline-none',
        'aria-[invalid=true]:border-[var(--danger)]',
        className
      )}
      {...props}
    />
  );
});

/**
 * Label, control and error message wired together, so screen readers announce
 * the problem with the field rather than leaving the message floating.
 */
export function Field({ label, error, hint, children, id: providedId }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-muted">
        {label}
      </label>

      {children({ id, invalid: Boolean(error), 'aria-describedby': error ? errorId : undefined })}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-12', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1 grid size-10 place-items-center rounded-xl text-muted transition-colors hover:text-body"
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}
