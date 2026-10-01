import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AlertCircle, ChevronLeft, History, LifeBuoy, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useAssistant, useAssistantHistory } from '@/hooks/useAssistant';
import { useIsDesktop, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { Link } from 'react-router-dom';
import { AssistantBubble } from '@/components/assistant/AssistantBubble';
import { AssistantComposer } from './AssistantComposer';
import { TypingIndicator } from '@/components/assistant/TypingIndicator';
import { useSupportPaths } from '@/hooks/useSupportPaths';
import { formatRelative } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * The assistant panel: a near-full-height sheet on a phone, a compact floating
 * panel in the corner on a desktop.
 *
 * Two decisions worth knowing about before editing this file.
 *
 * It is not a modal on desktop. A dimmed overlay would cover the map, the ride
 * controls and the navigation, and the point of a help panel is to read it
 * *while* looking at the thing you need help with. On a phone it is modal,
 * because the keyboard takes the screen anyway.
 *
 * The panel renders visible and animates *from* hidden, rather than rendering
 * hidden and animating to visible. If the animation never runs — a dropped
 * frame, a backgrounded tab, GSAP failing to load — the result is a panel with
 * no entrance rather than an invisible panel over working content. Failing
 * visible is the rule here; see `.page-in` in index.css for what the other way
 * round cost.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AssistantPanel({ open, onClose, returnFocusTo }) {
  const isDesktop = useIsDesktop();
  const reduceMotion = usePrefersReducedMotion();
  const support = useSupportPaths();

  // Mount ahead of `open` going false, so the closing animation has something
  // to animate. A safety net in the tween's onComplete does the unmount.
  const [mounted, setMounted] = useState(open);
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
      setShowHistory(false);
      setConfirmDelete(null);
    }
  }, [open]);

  // ------------------------------------------------------------- animation
  useGSAP(
    () => {
      const element = panel.current;
      if (!element || !mounted) return;

      const duration = reduceMotion ? 0 : 0.28;

      if (open) {
        gsap.killTweensOf(element);
        gsap.fromTo(
          element,
          { opacity: 0, scale: 0.96, y: isDesktop ? 12 : 24 },
          { opacity: 1, scale: 1, y: 0, duration, ease: 'power3.out', clearProps: 'transform' }
        );
        return;
      }

      gsap.killTweensOf(element);
      gsap.to(element, {
        opacity: 0,
        scale: 0.96,
        y: isDesktop ? 12 : 24,
        duration: duration * 0.7,
        ease: 'power2.in',
        onComplete: () => setMounted(false)
      });
    },
    { dependencies: [open, mounted, isDesktop, reduceMotion], scope: panel }
  );

  /**
   * If GSAP never gets to run its `onComplete` — a suspended tab, a killed
   * ticker — the panel would stay mounted over the app for ever. This is the
   * backstop that makes closing unconditional.
   */
  useEffect(() => {
    if (open || !mounted) return undefined;
    const timer = setTimeout(() => setMounted(false), 600);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  // ------------------------------------------------------------ focus & keys
  useEffect(() => {
    if (!open || !mounted) return undefined;

    // The answer arrives here, so this is where the cursor belongs.
    const timer = setTimeout(() => input.current?.focus(), reduceMotion ? 0 : 180);
    return () => clearTimeout(timer);
  }, [open, mounted, reduceMotion]);

  useEffect(() => {
    if (open || !returnFocusTo) return;
    // Back where it came from, so keyboard use does not lose its place.
    returnFocusTo.current?.focus?.();
  }, [open, returnFocusTo]);

  /**
   * Escape is listened for on the document, not on the panel.
   *
   * On the panel it only worked while focus happened to be inside it — and
   * focus lands on `<body>` the moment you click a control that then removes
   * itself, such as the button that switches back from the history list. The
   * panel was then open with no way to close it from the keyboard at all.
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
      // The trap only applies where the panel is modal. On desktop it is not,
      // and tabbing out of it into the page is the correct behaviour.
      if (event.key !== 'Tab' || isDesktop) return;

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
    [isDesktop]
  );

  // ------------------------------------------------------- keyboard on phones
  /**
   * How much of the window the on-screen keyboard is covering.
   *
   * `dvh` handles Android, where the keyboard resizes the viewport. iOS does
   * not resize it — the keyboard slides over the top — so without this the
   * composer ends up underneath it, which is the one thing the panel must
   * never do.
   */
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !mounted || isDesktop) return undefined;

    const measure = () => {
      const hidden = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(hidden);
    };

    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    measure();

    return () => {
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
      setKeyboardInset(0);
    };
  }, [mounted, isDesktop]);

  // ------------------------------------------------------------------ scroll
  // Stay pinned to the newest line, which is where the answer is being written.
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [assistant.messages.length, assistant.streaming, assistant.sending, showHistory]);

  /**
   * A question that failed goes back into the composer.
   *
   * It is the retry: the words are already there, so trying again is one tap
   * rather than typing the whole thing a second time.
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
    <>
      {/* The scrim exists on phones only. On desktop the panel is a companion
          to the page, not a replacement for it. */}
      {!isDesktop && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={onClose}
          className={cn(
            'fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      <section
        ref={panel}
        role="dialog"
        aria-modal={!isDesktop || undefined}
        aria-label="Raahi Assistant"
        onKeyDown={onKeyDown}
        style={!isDesktop ? { bottom: keyboardInset } : undefined}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border border-hair bg-elevated',
          'shadow-[var(--shadow-sheet)]',
          // Phone: a sheet off the bottom edge, rounded at the top only.
          'inset-x-0 bottom-0 max-h-[88dvh] h-[88dvh] rounded-t-[var(--radius-sheet)] border-x-0 border-b-0',
          // Desktop: a compact panel in the free corner, clear of the rail.
          'md:inset-x-auto md:bottom-6 md:right-6 md:h-[34rem] md:max-h-[calc(100dvh-6rem)] md:w-[23.5rem]',
          'md:rounded-[var(--radius-sheet)] md:border'
        )}
      >
        <Header
          showHistory={showHistory}
          onBack={() => {
            setShowHistory(false);
            // Put the cursor back in the composer. Leaving it on a button that
            // is about to unmount drops focus to the document, which is how a
            // keyboard user loses their place inside an open dialog.
            setTimeout(() => input.current?.focus(), 0);
          }}
          onHistory={() => setShowHistory(true)}
          onNew={() => {
            assistant.reset();
            setShowHistory(false);
            setDraft('');
            input.current?.focus();
          }}
          onClose={onClose}
          canStartNew={assistant.messages.length > 0 || Boolean(assistant.conversationId)}
        />

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
            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {assistant.loading ? (
                <p className="py-8 text-center text-sm text-muted">Loading…</p>
              ) : empty ? (
                <EmptyState
                  available={assistant.available}
                  quickActions={assistant.quickActions}
                  onPick={send}
                  supportPath={support.create}
                  onLeave={onClose}
                />
              ) : (
                assistant.messages.map((message) => <AssistantBubble key={message.id} message={message} />)
              )}

              {/* The partial answer, shown as its own bubble until the server's
                  stored version replaces it. */}
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
                className="mx-3 mb-2 flex items-start gap-2 rounded-2xl border border-[var(--danger-edge)] bg-[var(--danger-wash)] px-3 py-2.5"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-body">{assistant.error}</p>
                </div>
                <button
                  type="button"
                  onClick={assistant.clearError}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-full p-1 text-muted hover:text-body"
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
    </>
  );
}

// ------------------------------------------------------------------- pieces

function Header({ showHistory, onBack, onHistory, onNew, onClose, canStartNew }) {
  return (
    <header className="flex items-center gap-2 border-b border-hair px-3 py-2.5">
      {showHistory ? (
        <IconButton label="Back to chat" onClick={onBack}>
          <ChevronLeft className="size-[18px]" aria-hidden />
        </IconButton>
      ) : (
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-wash)]">
          <Sparkles className="size-4 text-accent" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold text-body">
          {showHistory ? 'Your chats' : 'Raahi Assistant'}
        </h2>
        {!showHistory && <p className="truncate text-[11.5px] text-faint">Rides, payments and support</p>}
      </div>

      {!showHistory && (
        <>
          {canStartNew && (
            <IconButton label="New chat" onClick={onNew}>
              <Plus className="size-[18px]" aria-hidden />
            </IconButton>
          )}
          <IconButton label="Your chats" onClick={onHistory}>
            <History className="size-[18px]" aria-hidden />
          </IconButton>
        </>
      )}

      <IconButton label="Close assistant" onClick={onClose}>
        <X className="size-[18px]" aria-hidden />
      </IconButton>
    </header>
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
        'grid size-9 shrink-0 place-items-center rounded-full transition-colors',
        tone === 'danger' ? 'text-[var(--danger)] hover:bg-[var(--danger-wash)]' : 'text-muted hover:bg-sunken hover:text-body'
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ available, quickActions, onPick, supportPath, onLeave }) {
  if (!available) {
    return (
      <div className="px-2 py-10 text-center">
        <p className="text-sm font-medium text-body">The assistant is not available right now</p>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-[13px] text-muted">
          You can still get help — raise a complaint from the Help screen and the support team will pick it up.
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="px-1 py-4">
        <p className="text-[15px] font-semibold text-body">Hi! How can I help?</p>
        <p className="mt-1 text-[13px] text-muted">
          Ask about rides, fares, payments or your account. I can explain things — I can&apos;t change them for you.
        </p>
      </div>

      {quickActions.length > 0 && (
        <ul className="space-y-1.5">
          {quickActions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => onPick(action.message)}
                className={cn(
                  'w-full rounded-2xl border border-hair bg-surface px-3.5 py-2.5 text-left',
                  'text-[13.5px] text-body transition-colors hover:bg-sunken active:scale-[0.99]'
                )}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/**
       * A real way to reach a person.
       *
       * The assistant explains things; it cannot refund a fare, look into a
       * charge, or resolve a complaint — and it is told to say so. Without a
       * route out of the panel, "raise a complaint" is advice rather than a
       * way through, so this goes to the complaint form the support team
       * actually works from.
       */}
      {supportPath && (
        <Link
          to={supportPath}
          onClick={onLeave}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-[12.5px] text-muted transition-colors hover:text-body"
        >
          <LifeBuoy className="size-3.5" aria-hidden />
          Need a person? Raise a complaint
        </Link>
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
        <p className="text-sm text-muted">No chats yet.</p>
        <p className="mt-1 text-[13px] text-faint">Anything you ask will be saved here.</p>
      </div>
    );
  }

  return (
    <ul className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
      {history.conversations.map((conversation) => (
        <li key={conversation.id} className="flex items-center gap-1 px-2">
          <button
            type="button"
            onClick={() => onOpen(conversation.id)}
            className="min-w-0 flex-1 rounded-xl px-2 py-3 text-left transition-colors hover:bg-sunken"
          >
            <p className="truncate text-[13.5px] font-medium text-body">
              {conversation.title || 'Untitled chat'}
              {conversation.id === currentId && <span className="ml-1.5 text-[11px] text-faint">· open</span>}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted">{conversation.lastMessagePreview}</p>
            <p className="mt-0.5 text-[11px] text-faint">{formatRelative(conversation.lastMessageAt)}</p>
          </button>

          {confirmDelete === conversation.id ? (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onDelete(conversation.id)}
                className="rounded-full bg-[var(--danger-wash)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--danger)]"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-full px-2 py-1.5 text-[12px] text-muted hover:text-body"
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
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          )}
        </li>
      ))}
    </ul>
  );
}
