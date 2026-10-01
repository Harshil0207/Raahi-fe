import { useCallback, useEffect, useRef, useState } from 'react';
import * as assistantApi from '@/services/assistant.api';

/**
 * `@/` HERE MEANS THE CONSUMING APP, NOT THIS FOLDER — and that is the point.
 *
 * This hook is identical for both apps; what differs is which assistant it
 * talks to. The customer app's module calls `/assistant`; the console's calls
 * `/admin/assistant` and signs with the admin token. Each app supplies its own
 * `services/assistant.api`, and the `@` alias resolves to whichever app is
 * building. That seam is why this file could be byte-identical in both places
 * and is the reason it is worth sharing at all.
 *
 * Everything else in `shared/` imports only npm packages or `@/…`. This
 * is the single exception, named so nobody has to discover it from a build
 * error.
 */

/**
 * One conversation with the AI assistant.
 *
 * The thread on screen is built from two things: what the server has stored,
 * and the answer currently arriving. They are kept apart — `messages` holds the
 * stored turns, `streaming` holds the partial answer — so a stream that breaks
 * off cannot leave a half-written bubble sitting in the history. When the turn
 * finishes, the server's own record of it replaces the partial text.
 *
 * Nothing here decides anything. The role, the quick actions, the limits and
 * the answers all come from the server; this only moves them onto the screen.
 */
export function useAssistant({ enabled = true } = {}) {
  const [status, setStatus] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [error, setError] = useState(null);
  // The question that did not get through, handed back to the composer.
  const [failedDraft, setFailedDraft] = useState(null);

  /**
   * The synchronous guard on a double send.
   *
   * `setSending(true)` does not take effect until React re-renders, so three
   * fast taps all see `sending === false` and all three send. A ref is the
   * only thing that is true by the time the second tap is handled.
   */
  const inFlight = useRef(false);
  const abort = useRef(null);

  // ------------------------------------------------------------------ status
  useEffect(() => {
    if (!enabled) return undefined;

    let alive = true;
    assistantApi
      .getStatus()
      .then((data) => {
        if (alive) setStatus(data);
      })
      .catch(() => {
        // A failed status read is not worth an error screen: the assistant just
        // looks unavailable, which is what it is.
        if (alive) setStatus({ available: false, quickActions: [] });
      });

    return () => {
      alive = false;
    };
  }, [enabled]);

  // Never leave a request running behind a closed panel.
  useEffect(() => () => abort.current?.abort(), []);

  const reset = useCallback(() => {
    abort.current?.abort();
    inFlight.current = false;
    setConversationId(null);
    setMessages([]);
    setStreaming('');
    setError(null);
    setFailedDraft(null);
    setSending(false);
  }, []);

  /** Opens a stored thread, replacing whatever is on screen. */
  const open = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const data = await assistantApi.getConversation(id);
      setConversationId(data.conversation.id);
      setMessages(data.messages);
      setStreaming('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(
    async (id) => {
      await assistantApi.deleteConversation(id);
      if (id === conversationId) reset();
    },
    [conversationId, reset]
  );

  /**
   * Ask a question.
   *
   * The question appears immediately with a temporary id so the panel does not
   * sit blank while the model thinks. When the turn completes, both sides are
   * replaced by what the server stored — so what is on screen after a send is
   * the server's record, not the browser's guess at it.
   */
  const send = useCallback(
    async (raw) => {
      const text = String(raw || '').trim();
      if (!text || inFlight.current) return;

      inFlight.current = true;
      setSending(true);
      setError(null);
      setStreaming('');

      const pending = { id: `pending-${Date.now()}`, role: 'user', content: text, pending: true };
      setMessages((current) => [...current, pending]);

      const controller = new AbortController();
      abort.current = controller;

      try {
        let answer = '';

        const result = await assistantApi.streamMessage({
          message: text,
          conversationId,
          signal: controller.signal,
          onChunk: (piece) => {
            answer += piece;
            setStreaming(answer);
          }
        });

        setConversationId(result.conversationId);
        setMessages((current) => [
          ...current.filter((message) => message.id !== pending.id),
          { id: `${result.message.id}-q`, role: 'user', content: text },
          result.message
        ]);
      } catch (err) {
        // The question comes off the screen and goes back into the composer, so
        // a retry is one tap. Leaving it in the thread with no answer under it
        // reads as an answer that never came, and losing it altogether means
        // typing the whole thing again.
        setMessages((current) => current.filter((message) => message.id !== pending.id));
        setError(err.name === 'AbortError' ? null : err.message);
        if (err.name !== 'AbortError') setFailedDraft(text);
      } finally {
        setStreaming('');
        setSending(false);
        inFlight.current = false;
        abort.current = null;
      }
    },
    [conversationId]
  );

  /** Stop an answer mid-flight. What arrived is kept by the server either way. */
  const stop = useCallback(() => abort.current?.abort(), []);

  return {
    status,
    available: status?.available ?? false,
    quickActions: status?.quickActions ?? [],
    maxMessageLength: status?.maxMessageLength ?? 2000,

    conversationId,
    messages,
    streaming,

    loading,
    sending,
    error,
    failedDraft,
    clearFailedDraft: () => setFailedDraft(null),

    send,
    stop,
    open,
    remove,
    reset,
    clearError: () => setError(null)
  };
}

/** The list of stored threads, loaded only when the history view is opened. */
export function useAssistantHistory(active) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assistantApi.listConversations();
      setConversations(data.conversations);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);

  return { conversations, loading, refresh };
}
