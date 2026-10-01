import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] shadow-[0_8px_22px_-12px_var(--accent)]',
        neutral: 'bg-[var(--text)] text-[var(--background)] hover:opacity-90',
        outline: 'border bg-[var(--surface-elevated)] text-body hover:bg-[var(--surface-sunken)]',
        subtle: 'bg-[var(--accent-wash)] text-accent hover:brightness-110',
        ghost: 'text-muted hover:bg-[var(--surface-sunken)] hover:text-body',
        danger: 'bg-[var(--danger-wash)] text-[var(--danger)] border border-[var(--danger-edge)] hover:bg-[var(--danger-wash-strong)]'
      },
      size: {
        // Everything clears 44px except `icon-sm`, which lives inside a larger target.
        sm: 'h-10 px-4 text-sm [&_svg]:size-4',
        md: 'h-12 px-5 text-[15px] [&_svg]:size-[18px]',
        lg: 'h-14 px-6 text-base [&_svg]:size-5',
        icon: 'size-12 [&_svg]:size-5',
        'icon-sm': 'size-9 [&_svg]:size-4'
      },
      block: { true: 'w-full' }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}) {
  // Slot takes exactly one child, so a slotted button never gets the spinner
  // beside its content — two children make it throw. A link has nothing to be
  // busy about, so there is nothing to lose.
  if (asChild) {
    return (
      <Slot className={cn(buttonVariants({ variant, size, block }), className)} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
