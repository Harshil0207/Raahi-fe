import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Send } from 'lucide-react';
import { BottomSheet, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * The chat with the other party on this ride.
 *
 * A sheet rather than a route, because a ride screen is where someone is
 * standing on a pavement looking for a car — they need to glance at the map and
 * come straight back to the conversation, not navigate away from it.
 *
 * Opening the sheet is what marks the thread read; there is nothing else to mark.
 */
export function ChatSheet({ rideId, open, onOpenChange, otherName, otherRole = 'rider' }) {
  const { user } = useAuth();

  // The chat is only subscribed while the sheet is open: a socket room and a
  // history fetch for a screen nobody is looking at is waste.
  const chat = useChat(rideId, { enabled: open });

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const scroller = useRef(null);
  const typingStop = useRef(null);

  // Reading is what opening the sheet means — and it keeps meaning that while
  // the sheet stays open, so a reply that arrives mid-conversation is marked
  // read too rather than sitting as an unread badge behind an open chat.
  const newest = chat.messages[chat.messages.length - 1];
  // "From the other side" is decided the same way a bubble decides whose it
  // is: the server's record of the sender against the signed-in account.
  const newestFromOther = newest && String(newest.senderId) !== String(user?.id ?? user?._id);

  useEffect(() => {
    if (open) chat.markRead();
    // Keyed on the newest incoming message rather than the whole list, so this
    // is one request per arrival, not one per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rideId, newestFromOther ? newest?.id : null]);

  // Stay pinned to the newest message, which is where a chat is read from.
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [chat.messages.length, chat.otherTyping, open]);

  useEffect(() => () => clearTimeout(typingStop.current), []);

  function onDraftChange(value) {
    setDraft(value);

    chat.setTyping(true);
    clearTimeout(typingStop.current);
    typingStop.current = setTimeout(() => chat.setTyping(false), 1800);
  }

  async function submit(event) {
    event?.preventDefault();

    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setSendError(null);

    try {
      await chat.send(body);
      setDraft('');
      chat.setTyping(false);
      clearTimeout(typingStop.current);
    } catch (err) {
      // The draft is deliberately kept so nothing is lost on a failed send.
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  const closed = chat.conversation && !chat.canSend;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} detent="full" label={`Chat with your ${otherRole}`}>
      <SheetHeader
        title={otherName ? `Chat with ${otherName.split(' ')[0]}` : `Chat with your ${otherRole}`}
        description={
          chat.otherTyping
            ? 'typing…'
            : closed
              ? 'This conversation is closed'
              : `Messages go straight to your ${otherRole}`
        }
      />

      <div
        ref={scroller}
        className="space-y-2.5 overflow-y-auto px-4 pb-2"
        // Enough room for a real conversation without the composer leaving the
        // screen on a small phone.
        style={{ maxHeight: '58dvh', minHeight: '38dvh' }}
      >
        {!chat.loaded ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-10 w-3/5 rounded-2xl" />
          </div>
        ) : chat.error ? (
          <p className="py-6 text-center text-sm text-muted">{chat.error}</p>
        ) : chat.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No messages yet. Say hello, or send where exactly you are waiting.
          </p>
        ) : (
          chat.messages.map((message) => (
            <Bubble
              key={message.id}
              message={message}
              // Ownership comes from the server's record of who sent it,
              // compared against the signed-in account — not from anything the
              // client tracked while sending.
              mine={String(message.senderId) === String(user?.id ?? user?._id)}
            />
          ))
        )}

        <AnimatePresence>
          {chat.otherTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <span className="flex items-center gap-1 rounded-2xl bg-sunken px-3 py-2.5" aria-label="Typing">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-[var(--text-muted)]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {closed ? (
        <div className="flex items-center gap-2 border-t border-hair px-4 py-3.5 pb-safe text-[13px] text-muted">
          <Lock className="size-4 shrink-0" aria-hidden />
          The chat closed after this trip ended. Use Help if you still need something.
        </div>
      ) : (
        <form onSubmit={submit} className="border-t border-hair px-3 py-2.5 pb-safe">
          {sendError && (
            <p role="alert" className="mb-2 px-1 text-xs text-[var(--danger)]">
              {sendError}
            </p>
          )}

          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter is a new line. On a phone the virtual
                // keyboard's return key inserts a newline, which is why the send
                // button is always there.
                if (event.key === 'Enter' && !event.shiftKey) submit(event);
              }}
              rows={1}
              maxLength={1000}
              placeholder="Message…"
              aria-label="Message"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-hair bg-sunken px-3.5 py-3 text-[15px] text-body outline-none placeholder:text-faint focus-visible:border-[var(--accent)]"
            />

            <Button
              type="submit"
              size="icon"
              variant="primary"
              className="size-11 shrink-0 rounded-full"
              disabled={!draft.trim()}
              loading={sending}
              aria-label="Send"
            >
              {!sending && <Send aria-hidden />}
            </Button>
          </div>
        </form>
      )}
    </BottomSheet>
  );
}

function Bubble({ message, mine }) {
  if (message.messageType === 'SYSTEM' || message.senderRole === 'system') {
    return <p className="py-1 text-center text-[11.5px] text-faint">{message.message}</p>;
  }

  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14.5px]',
          mine ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-sunken text-body'
        )}
      >
        {message.message}
      </div>
      <p className="mt-1 px-1 text-[10.5px] text-faint">
        {formatTime(message.createdAt)}
        {mine && message.readAt ? ' · read' : ''}
      </p>
    </div>
  );
}
