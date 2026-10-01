import { cva } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Console buttons: rectangular with a small radius, not pills. A pill reads as
 * consumer; a table of them reads as a toy.
 */
const buttonStyles = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-field)]',
    'font-medium transition-colors duration-100',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:shrink-0'
  ],
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)]',
        // The default for most console actions: visible, but not shouting.
        outline: 'border border-firm bg-surface text-body hover:bg-[var(--surface-hover)]',
        subtle: 'bg-sunken text-body hover:bg-[var(--surface-hover)]',
        ghost: 'text-muted hover:bg-[var(--surface-hover)] hover:text-body',
        danger: 'bg-[var(--danger)] text-white hover:brightness-110',
        dangerOutline:
          'border border-[var(--danger-edge)] bg-[var(--danger-wash)] text-[var(--danger)] hover:brightness-105'
      },
      size: {
        sm: 'h-7 px-2.5 text-[12.5px] [&_svg]:size-3.5',
        md: 'h-9 px-3.5 text-[13.5px] [&_svg]:size-4',
        lg: 'h-10 px-4 text-[14px] [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-7 [&_svg]:size-3.5'
      },
      block: { true: 'w-full' }
    },
    defaultVariants: { variant: 'outline', size: 'md' }
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
  // `asChild` hands the styling to whatever is inside — usually a router Link.
  // Slot takes exactly one child, so the spinner is not rendered beside it: a
  // second child (even a `false`) makes Slot throw and the screen goes blank.
  // A link has nothing to be busy about anyway.
  if (asChild) {
    return (
      <Slot className={cn(buttonStyles({ variant, size, block }), className)} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={cn(buttonStyles({ variant, size, block }), className)}
      disabled={disabled || loading}
      type={props.type || 'button'}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
