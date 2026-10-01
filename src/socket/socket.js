import { io } from 'socket.io-client';
import { getAccessToken } from '@/services/api';

// Same reasoning as the API base: derived from the page, so a phone on the
// same network connects to the machine serving it rather than to its own
// localhost. `VITE_SOCKET_URL` still wins when set.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

let socket = null;

// Connection-state listeners. These live at module level because the socket is
// created after the first render (once a session exists), and a subscriber that
// attached before that would otherwise never hear about it.
const statusListeners = new Set();
const notifyStatus = () => statusListeners.forEach((fn) => fn());

export function subscribeToStatus(listener) {
  statusListeners.add(listener);
  bindStatusEvents();

  return () => statusListeners.delete(listener);
}

let statusBound = false;

function bindStatusEvents() {
  if (!socket || statusBound) return;
  statusBound = true;
  socket.on('connect', notifyStatus);
  socket.on('disconnect', notifyStatus);
  socket.on('connect_error', notifyStatus);
}

export const isSocketConnected = () => Boolean(socket?.connected);

/**
 * One connection per session. The server authenticates the handshake with the
 * same access token the REST API uses and puts the socket in its own room, so
 * there is nothing to subscribe to on connect.
 */
export function connectSocket() {
  const token = getAccessToken();
  if (!token) return null;

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000
  });

  // A rotated access token must be used for the next handshake, otherwise a
  // reconnect after a refresh is rejected as unauthenticated.
  socket.io.on('reconnect_attempt', () => {
    socket.auth = { token: getAccessToken() };
  });

  bindStatusEvents();
  notifyStatus();

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  statusBound = false;
  notifyStatus();
}
