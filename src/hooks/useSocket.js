import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { connectSocket, getSocket, isSocketConnected, subscribeToStatus } from '@/socket/socket';

/**
 * Subscribes to socket events and tears the listeners down on unmount. Handlers
 * live in a ref so a re-render with new closures does not re-subscribe.
 */
export function useSocketEvents(handlers, deps = []) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const socket = getSocket() || connectSocket();
    if (!socket) return;

    // Bound from the handlers as they are right now, not from a snapshot taken
    // when the hook first ran: a caller whose set of event names changes with
    // its deps would otherwise never have the new events subscribed at all.
    const bound = Object.keys(handlers).map((name) => {
      const fn = (...args) => handlersRef.current[name]?.(...args);
      socket.on(name, fn);
      return [name, fn];
    });

    return () => bound.forEach(([name, fn]) => socket.off(name, fn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Connection state read straight off the socket rather than mirrored into
 * state. The subscription is module-level, so it also picks up the socket being
 * created after this component mounted.
 */
export function useSocketStatus() {
  const subscribe = useCallback((onChange) => subscribeToStatus(onChange), []);
  const getSnapshot = useCallback(() => isSocketConnected(), []);

  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
