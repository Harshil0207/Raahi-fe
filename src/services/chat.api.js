import { api, unwrap } from './api';

/**
 * Ride chat over REST. The socket carries live messages; these are the reads the
 * socket has no business doing, plus a send that still works when the socket is
 * down — a dropped connection should cost a retry, not the message.
 */

export const getConversation = (rideId) => api.get(`/chats/${rideId}`).then(unwrap);

export const listMessages = (rideId, params = {}) =>
  api.get(`/chats/${rideId}/messages`, { params }).then(unwrap);

export const sendMessage = (rideId, message) =>
  api.post(`/chats/${rideId}/messages`, { message }).then(unwrap);

export const markRead = (rideId) => api.post(`/chats/${rideId}/read`).then(unwrap);

/** Unread across every conversation, for the badge. */
export const unreadTotal = () => api.get('/chats/unread').then(unwrap);
