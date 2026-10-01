import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, History, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useAssistant, useAssistantHistory } from '@/hooks/useAssistant';
import { AssistantBubble } from '@/components/assistant/AssistantBubble';
import { AssistantComposer } from './AssistantComposer';
import { TypingIndicator } from '@/components/assistant/TypingIndicator';
import { formatDateTime } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * The assistant, in the operations console.
 *
 * The same backend, the same hook and the same renderer as the customer and
 * rider app — only the mount differs, and the console's own authentication
 * decides that the role is ADMIN. An operator gets their own conversations and
 * nobody else's; there is no endpoint that would give them somebody else's.
 *
 * Two differences from the app's panel, both because this is a different
 * application rather than a different opinion:
 *
 *   - It is never modal. A console is a reference tool, and an overlay over the
 *     table you are asking about would defeat the point.
 *   - The entrance is a CSS keyframe rather than GSAP, because GSAP is not a
 *     dependency of this app and a support panel is not a reason to add one.
 *     It also fails better: the panel renders visible and the animation only
 *     moves it, so a frame that never runs costs an entrance, not the panel.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AssistantPanel({ open, onClose, returnFocusTo }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const panel = useRef(null);
  const scroller = useRef(null);
  const input = useRef(null);

  const assistant = useAssistant({ enabled: mounted });
  const history = useAssistantHistory(showHistory);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setShowHistory(false);
      setConfirmDelete(null);
      return undefined;
    }

    if (!mounted) return undefined;

    // Let the exit keyframe play, then unmount unconditionally — a timer
    // rather than an animation event, so a browser that never fires one still
    // closes the panel.
    setClosing(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 180);

    return () => clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return undefined;
    const timer = setTimeout(() => input.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (open || !returnFocusTo) return;
    returnFocusTo.current?.focus?.();
  }, [open, returnFocusTo]);

  /**
   * Escape is listened for on the document, not on the panel.
   *
   * On the panel it only worked while focus happened to be inside it, and
   * focus lands on `<body>` as soon as you click a control that then removes
   * itself — such as the button that comes back from the history list.
   */
  useEffect(() => {
    if (!open || !mounted) return undefined;

    const onEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, mounted, onClose]);

  const onKeyDown = useCallback(
    (event) => {
      // The console panel is not modal, so Tab is only cycled within it when it
      // would otherwise fall off the end — which keeps a keyboard user inside
      // the thing they opened without locking them out of the page behind it.
      if (event.key !== 'Tab') return;

      const focusable = [...(panel.current?.querySelectorAll(FOCUSABLE) || [])].filter(
        (node) => node.offsetParent !== null
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    []
  );

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [assistant.messages.length, assistant.streaming, assistant.sending, showHistory]);

  /**
   * A question that failed goes back into the composer, so retrying is one tap
   * rather than typing it again.
   */
  useEffect(() => {
    if (!assistant.failedDraft) return;
    setDraft(assistant.failedDraft);
    assistant.clearFailedDraft();
    input.current?.focus();
  }, [assistant]);

  if (!mounted) return null;

  const send = (text) => {
    const body = (text ?? draft).trim();
    if (!body) return;
    setDraft('');
    assistant.send(body);
  };

  const empty = !assistant.messages.length && !assistant.sending && !assistant.loading;

  return (
    <section
      ref={panel}
      role="dialog"
      aria-label="Raahi Assistant"
      onKeyDown={onKeyDown}
      className={cn(
        'fixed bottom-20 right-5 z-50 flex w-[23rem] flex-col overflow-hidden',
        'rounded-[var(--radius-card)] border border-hair bg-elevated shadow-[var(--shadow-float)]',
        'h-[32rem] max-h-[calc(100dvh-7rem)]',
        closing ? 'assistant-panel-out' : 'assistant-panel-in'
      )}
    >
      <header className="flex items-center gap-2 border-b border-hair px-2.5 py-2">
        {showHistory ? (
          <IconButton
            label="Back to chat"
            onClick={() => {
              setShowHistory(false);
              // Keep focus inside the dialog rather than dropping it to <body>
              // when this button unmounts itself.
              setTimeout(() => input.current?.focus(), 0);
            }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </IconButton>
        ) : (
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-field)] bg-[var(--accent-wash)]">
            <Sparkles className="size-3.5 text-accent" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13.5px] font-semibold text-body">
            {showHistory ? 'Your chats' : 'Raahi Assistant'}
          </h2>
          {!showHistory && <p className="truncate text-[11px] text-faint">Settings, pricing and how the platform behaves</p>}
        </div>

        {!showHistory && (
          <>
            {(assistant.messages.length > 0 || assistant.conversationId) && (
              <IconButton
                label="New chat"
                onClick={() => {
                  assistant.reset();
                  setDraft('');
                  input.current?.focus();
                }}
              >
                <Plus className="size-4" aria-hidden />
              </IconButton>
            )}
            <IconButton label="Your chats" onClick={() => setShowHistory(true)}>
              <History className="size-4" aria-hidden />
            </IconButton>
          </>
        )}

        <IconButton label="Close assistant" onClick={onClose}>
          <X className="size-4" aria-hidden />
        </IconButton>
      </header>

      {showHistory ? (
        <HistoryView
          history={history}
          currentId={assistant.conversationId}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          onOpen={async (id) => {
            await assistant.open(id);
            setShowHistory(false);
          }}
          onDelete={async (id) => {
            await assistant.remove(id);
            setConfirmDelete(null);
            history.refresh();
          }}
        />
      ) : (
        <>
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {assistant.loading ? (
              <p className="py-8 text-center text-sm text-muted">Loading…</p>
            ) : empty ? (
              <EmptyState
                available={assistant.available}
                quickActions={assistant.quickActions}
                onPick={send}
              />
            ) : (
              assistant.messages.map((message) => <AssistantBubble key={message.id} message={message} />)
            )}

            {assistant.streaming && (
              <AssistantBubble
                streaming
                message={{ id: 'streaming', role: 'assistant', content: assistant.streaming }}
              />
            )}

            {assistant.sending && !assistant.streaming && <TypingIndicator />}
          </div>

          {assistant.error && (
            <div
              role="alert"
              className="mx-3 mb-2 flex items-start gap-2 rounded-[var(--radius-field)] border border-[var(--danger-edge)] bg-[var(--danger-wash)] px-2.5 py-2"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[var(--danger)]" aria-hidden />
              <p className="min-w-0 flex-1 text-[12.5px] text-body">{assistant.error}</p>
              <button
                type="button"
                onClick={assistant.clearError}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-muted hover:text-body"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          )}

          <AssistantComposer
            value={draft}
            onChange={setDraft}
            onSubmit={() => send()}
            onStop={assistant.stop}
            sending={assistant.sending}
            disabled={!assistant.available}
            maxLength={assistant.maxMessageLength}
            inputRef={input}
          />
        </>
      )}
    </section>
  );
}

function IconButton({ label, onClick, children, tone = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-[var(--radius-field)] transition-colors',
        tone === 'danger'
          ? 'text-[var(--danger)] hover:bg-[var(--danger-wash)]'
          : 'text-muted hover:bg-sunken hover:text-body'
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ available, quickActions, onPick }) {
  if (!available) {
    return (
      <div className="px-2 py-10 text-center">
        <p className="text-[13.5px] font-medium text-body">The assistant is not available</p>
        {/* Deliberately does not name the environment variable. It would put
            that name into a public bundle for no gain: the person who can fix
            this is reading the server log, which says exactly which key is
            missing. */}
        <p className="mx-auto mt-1.5 max-w-[17rem] text-[12.5px] text-muted">
          No AI key is configured on the backend, so no questions can be answered. The server log names the
          setting that is missing.
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      <div className="px-1 py-3">
        <p className="text-[13.5px] font-semibold text-body">Ask about the platform</p>
        <p className="mt-1 text-[12.5px] text-muted">
          It explains settings, pricing and how things work, using the values currently configured. It cannot
          change anything.
        </p>
      </div>

      {quickActions.length > 0 && (
        <ul className="space-y-1">
          {quickActions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => onPick(action.message)}
                className="w-full rounded-[var(--radius-field)] border border-hair bg-surface px-3 py-2 text-left text-[12.5px] text-body transition-colors hover:bg-sunken"
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryView({ history, currentId, confirmDelete, setConfirmDelete, onOpen, onDelete }) {
  if (history.loading) {
    return <p className="flex-1 px-4 py-8 text-center text-sm text-muted">Loading…</p>;
  }

  if (!history.conversations.length) {
    return (
      <div className="flex-1 px-6 py-10 text-center">
        <p className="text-[13px] text-muted">No chats yet.</p>
      </div>
    );
  }

  return (
    <ul className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
      {history.conversations.map((conversation) => (
        <li key={conversation.id} className="flex items-center gap-1 px-1.5">
          <button
            type="button"
            onClick={() => onOpen(conversation.id)}
            className="min-w-0 flex-1 rounded-[var(--radius-field)] px-2 py-2.5 text-left transition-colors hover:bg-sunken"
          >
            <p className="truncate text-[12.5px] font-medium text-body">
              {conversation.title || 'Untitled chat'}
              {conversation.id === currentId && <span className="ml-1.5 text-[10.5px] text-faint">· open</span>}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted">{conversation.lastMessagePreview}</p>
            <p className="mt-0.5 text-[10.5px] text-faint">{formatDateTime(conversation.lastMessageAt)}</p>
          </button>

          {confirmDelete === conversation.id ? (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onDelete(conversation.id)}
                className="rounded-[var(--radius-field)] bg-[var(--danger-wash)] px-2 py-1 text-[11.5px] font-medium text-[var(--danger)]"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-[var(--radius-field)] px-1.5 py-1 text-[11.5px] text-muted hover:text-body"
              >
                Keep
              </button>
            </span>
          ) : (
            <IconButton
              tone="danger"
              label={`Delete ${conversation.title || 'this chat'}`}
              onClick={() => setConfirmDelete(conversation.id)}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </IconButton>
          )}
        </li>
      ))}
    </ul>
  );
}
