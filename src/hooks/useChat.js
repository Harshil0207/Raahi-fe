import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/socket/socket';
import * as chatApi from '@/services/chat.api';
import { SOCKET_EVENTS } from '@/constants/socketEvents';

/**
 * One ride's chat.
 *
 * History comes over REST and live messages over the socket, which is the split
 * that makes a phone app work: opening the screen shows the thread immediately
 * from a normal request, and anything new arrives without polling.
 *
 * Sending goes through the socket when it is connected and falls back to REST
 * when it is not, because on a phone the connection drops in a lift and the
 * message should still go.
 */
export function useChat(rideId, { enabled = true } = {}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);

  // The socket handler needs to know which side we are without re-subscribing
  // every time the conversation object changes.
  const side = useRef(null);
  const typingTimer = useRef(null);

  // ------------------------------------------------------------------ history
  useEffect(() => {
    if (!rideId || !enabled) return undefined;

    let cancelled = false;

    chatApi
      .listMessages(rideId, { limit: 50 })
      .then((result) => {
        if (cancelled) return;
        setConversation(result.conversation);
        setMessages(result.messages);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoaded(true));

    return () => {
      cancelled = true;
    };
  }, [rideId, enabled]);

  // ------------------------------------------------------------ live updates
  useEffect(() => {
    if (!rideId || !enabled) return undefined;

    const socket = getSocket();
    if (!socket) return undefined;

    const join = () =>
      socket.emit(SOCKET_EVENTS.CHAT_JOIN, { rideId }, (ack) => {
        if (ack?.success) side.current = ack.data?.side || null;
      });

    join();
    // A reconnect drops room membership, so re-join rather than going quiet.
    socket.on('connect', join);

    const onNew = (message) => {
      if (String(message.rideId) !== String(rideId)) return;

      setMessages((current) =>
        // The socket and the REST response can both deliver the same message.
        current.some((existing) => existing.id === message.id) ? current : [...current, message]
      );

      // Someone else's message means they have stopped typing.
      if (message.senderRole !== side.current) setOtherTyping(false);
    };

    const onTyping = (payload) => {
      if (String(payload.rideId) !== String(rideId)) return;
      if (payload.side === side.current) return;

      setOtherTyping(payload.typing);

      // The sender may never send `typing: false` — they might close the app —
      // so the indicator expires on its own.
      clearTimeout(typingTimer.current);
      if (payload.typing) typingTimer.current = setTimeout(() => setOtherTyping(false), 4000);
    };

    const onRead = (payload) => {
      if (String(payload.rideId) !== String(rideId)) return;
      if (payload.readBy === side.current) return;

      setMessages((current) =>
        current.map((message) =>
          message.senderRole === side.current && !message.readAt
            ? { ...message, readAt: payload.at }
            : message
        )
      );
    };

    const onClosed = (payload) => {
      if (String(payload.rideId) !== String(rideId)) return;
      setConversation((current) =>
        current ? { ...current, status: payload.status, canSend: payload.status !== 'CLOSED' } : current
      );
    };

    socket.on(SOCKET_EVENTS.CHAT_NEW, onNew);
    socket.on(SOCKET_EVENTS.CHAT_TYPING, onTyping);
    socket.on(SOCKET_EVENTS.CHAT_READ, onRead);
    socket.on(SOCKET_EVENTS.CHAT_CLOSED, onClosed);

    return () => {
      clearTimeout(typingTimer.current);
      socket.off('connect', join);
      socket.off(SOCKET_EVENTS.CHAT_NEW, onNew);
      socket.off(SOCKET_EVENTS.CHAT_TYPING, onTyping);
      socket.off(SOCKET_EVENTS.CHAT_READ, onRead);
      socket.off(SOCKET_EVENTS.CHAT_CLOSED, onClosed);
      socket.emit(SOCKET_EVENTS.CHAT_LEAVE, { rideId });
    };
  }, [rideId, enabled]);

  // ---------------------------------------------------------------- actions
  const send = useCallback(
    async (text) => {
      const body = String(text || '').trim();
      if (!body) return null;

      const socket = getSocket();

      if (socket?.connected) {
        return new Promise((resolve, reject) => {
          socket.emit(SOCKET_EVENTS.CHAT_SEND, { rideId, message: body }, (ack) => {
            if (ack?.success) {
              // The echo may beat this ack; the guard in `onNew` prevents a double.
              const message = ack.data;
              setMessages((current) =>
                current.some((existing) => existing.id === message.id) ? current : [...current, message]
              );
              resolve(message);
            } else {
              reject(new Error(ack?.message || 'Could not send the message'));
            }
          });
        });
      }

      // No socket: the same send over REST.
      const message = await chatApi.sendMessage(rideId, body);
      setMessages((current) =>
        current.some((existing) => existing.id === message.id) ? current : [...current, message]
      );
      return message;
    },
    [rideId]
  );

  const markRead = useCallback(() => {
    const socket = getSocket();

    if (socket?.connected) socket.emit(SOCKET_EVENTS.CHAT_READ, { rideId });
    else chatApi.markRead(rideId).catch(() => {});

    setConversation((current) => (current ? { ...current, unread: 0 } : current));
  }, [rideId]);

  /** Fire-and-forget: a typing hint is worthless a second later. */
  const setTyping = useCallback(
    (typing) => {
      const socket = getSocket();
      if (socket?.connected) socket.emit(SOCKET_EVENTS.CHAT_TYPING, { rideId, typing });
    },
    [rideId]
  );

  return {
    conversation,
    messages,
    loaded,
    error,
    otherTyping,
    canSend: conversation ? conversation.canSend : false,
    unread: conversation?.unread ?? 0,
    send,
    markRead,
    setTyping
  };
}

/**
 * Unread chat messages across every conversation, for the badge on the ride
 * screen's chat button.
 *
 * Refreshed on a chat event rather than polled, so the number moves when a
 * message actually arrives.
 */
export function useChatUnread({ enabled = true } = {}) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!enabled) return;
    chatApi
      .unreadTotal()
      .then((result) => setUnread(result.unread || 0))
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = getSocket();
    if (!socket) return undefined;

    const bump = () => refresh();
    socket.on(SOCKET_EVENTS.CHAT_NEW, bump);

    return () => socket.off(SOCKET_EVENTS.CHAT_NEW, bump);
  }, [enabled, refresh]);

  return { unread, refresh };
}
