import { forwardRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The way in.
 *
 * Sits clear of the tab bar on mobile and in the free corner on desktop, and
 * turns into a close control while the panel is open so the same target does
 * both — on a phone, a second button appearing under your thumb is how you
 * close something you meant to scroll.
 *
 * Styled from the same tokens as the rest of the app rather than as a brightly
 * coloured badge: it is a help button, not an advertisement.
 */
export const AssistantButton = forwardRef(function AssistantButton(
  { open, onClick, className },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close Raahi Assistant' : 'Open Raahi Assistant'}
      aria-expanded={open}
      className={cn(
        'fixed z-40 grid place-items-center rounded-full',
        'size-13 border border-hair bg-elevated shadow-[var(--shadow-float)]',
        'text-accent transition-transform duration-150 active:scale-95',
        'hover:bg-sunken',
        // Above the floating tab bar on a phone; the free corner on desktop,
        // where the navigation is a rail down the left.
        'bottom-[5.75rem] right-4 md:bottom-6 md:right-6',
        className
      )}
      style={{ width: '3.25rem', height: '3.25rem' }}
    >
      {open ? <X className="size-5" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
    </button>
  );
});
