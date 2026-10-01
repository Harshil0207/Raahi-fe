import { useEffect, useRef } from 'react';
import { getSocket } from '@/admin/socket/socket';

/**
 * Calls back whenever any ride moves.
 *
 * The handler is held in a ref so a caller can pass an inline function without
 * the listener being torn down and re-added on every render.
 */
export function useRideEvents(onMoved) {
  const handler = useRef(onMoved);

  useEffect(() => {
    handler.current = onMoved;
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const listener = (payload) => handler.current?.(payload);
    socket.on('admin:ride:moved', listener);

    return () => socket.off('admin:ride:moved', listener);
  }, []);
}
