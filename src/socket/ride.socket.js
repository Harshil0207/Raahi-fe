import { getSocket } from './socket';
import { CLIENT_EVENTS } from '@/constants/socketEvents';

/**
 * Ride room membership is checked server-side against the database, so joining
 * is a request, not an assertion. Re-joining after a reconnect is required —
 * rooms do not survive a dropped socket.
 */
export function joinRide(rideId) {
  const socket = getSocket();
  if (!socket || !rideId) return;

  const join = () => socket.emit(CLIENT_EVENTS.RIDE_JOIN, { rideId });

  if (socket.connected) join();
  socket.on('connect', join);

  return () => {
    socket.off('connect', join);
    if (socket.connected) socket.emit(CLIENT_EVENTS.RIDE_LEAVE, { rideId });
  };
}

export function pushLocationOverSocket(position) {
  const socket = getSocket();
  if (!socket?.connected) return false;

  socket.emit(CLIENT_EVENTS.LOCATION_UPDATE, position);
  return true;
}

// Riders can answer an offer over the socket; identical server-side rules apply.
export function respondToRequest(action, requestId) {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket?.connected) return reject(new Error('Not connected'));

    socket.emit(`ride:${action}`, { requestId }, (reply) => {
      if (reply?.success) resolve(reply.data);
      else reject(new Error(reply?.message || 'Request failed'));
    });
  });
}
