import { Sparkles } from 'lucide-react';
import { AssistantMarkdown } from './AssistantMarkdown';
import { cn } from '@/lib/utils';

/**
 * One turn.
 *
 * The person's own words are shown as they typed them — plain text, never
 * parsed — so a question containing `**` or a URL reads back exactly as sent.
 * Only the model's answer goes through the markdown renderer, and that renderer
 * produces React elements rather than HTML, so there is no markup path either
 * way.
 */
export function AssistantBubble({ message, streaming = false }) {
  const mine = message.role === 'user';

  if (mine) {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-3.5 py-2.5 text-[14.5px]',
            'bg-[var(--accent)] text-[var(--accent-contrast)]',
            message.pending && 'opacity-70'
          )}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <span
        aria-hidden
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--accent-wash)]"
      >
        <Sparkles className="size-3.5 text-accent" />
      </span>

      <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md bg-sunken px-3.5 py-2.5 text-body">
        <AssistantMarkdown>{message.content}</AssistantMarkdown>

        {streaming && (
          // A caret while the words are still arriving, so a pause mid-answer
          // reads as "still going" rather than "stopped".
          <span aria-hidden className="assistant-dot ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] bg-[var(--text-muted)]" />
        )}
      </div>
    </div>
  );
}
