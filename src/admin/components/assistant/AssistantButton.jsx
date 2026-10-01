import { forwardRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The way in, in the console's corner.
 *
 * Deliberately quiet: an operations tool should not have a glowing bubble
 * competing with the data on the page.
 */
export const AssistantButton = forwardRef(function AssistantButton({ open, onClick, className }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close Raahi Assistant' : 'Open Raahi Assistant'}
      aria-expanded={open}
      className={cn(
        'fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-[var(--radius-card)]',
        'border border-hair bg-elevated px-3 py-2 shadow-[var(--shadow-float)]',
        'text-[12.5px] font-medium text-body transition-colors hover:bg-sunken',
        className
      )}
    >
      {open ? <X className="size-4 text-muted" aria-hidden /> : <Sparkles className="size-4 text-accent" aria-hidden />}
      Assistant
    </button>
  );
});
