import { io } from 'socket.io-client';
import { getToken } from '@/admin/services/api';

/**
 * The console's socket.
 *
 * One connection for the whole app, opened lazily when a screen first wants
 * live updates and torn down on sign-out. `scope: 'admin'` tells the backend
 * which kind of token this is, so it verifies against the admin key rather than
 * attempting a customer verification that would always fail.
 *
 * An admin socket is read-only by construction: the server registers no
 * handlers for it, so there is nothing for this client to emit.
 */

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  const token = getToken();
  if (!token) return null;

  if (socket) {
    // The token changes when an admin signs in again; reconnect under the new one.
    if (socket.auth?.token !== token) {
      socket.auth = { token, scope: 'admin' };
      socket.disconnect().connect();
    }
    return socket;
  }

  socket = io(URL, {
    auth: { token, scope: 'admin' },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000
  });

  // Re-send the current token on every reconnect: a session that expired while
  // the tab was asleep should fail the handshake rather than reconnect stale.
  socket.on('reconnect_attempt', () => {
    socket.auth = { token: getToken(), scope: 'admin' };
  });

  return socket;
}

export function closeSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
