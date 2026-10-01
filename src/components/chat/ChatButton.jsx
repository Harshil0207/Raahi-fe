import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Opens the ride chat, with the unread count on it.
 *
 * The badge is the whole point: someone staring at a map does not notice a
 * message otherwise.
 */
export function ChatButton({ onClick, unread = 0, className, label = 'Chat' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unread > 0 ? `${label}, ${unread} unread` : label}
      className={cn(
        'relative flex items-center gap-2 rounded-full border border-hair bg-elevated px-3.5 py-2.5',
        'text-[13.5px] font-medium text-body shadow-[var(--shadow-raise)]',
        'transition-transform active:scale-[0.97]',
        className
      )}
    >
      <MessageSquare className="size-4 text-accent" aria-hidden />
      {label}

      {unread > 0 && (
        <span
          className="tabular absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-[var(--danger)] px-1 text-[10.5px] font-semibold text-white"
          aria-hidden
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
