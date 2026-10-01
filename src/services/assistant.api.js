import { api, unwrap, getAccessToken } from './api';

/**
 * The AI assistant.
 *
 * Note what is not in this file: no API key, no model name, no prompt, and no
 * address belonging to Google. The browser talks to our own backend and the
 * backend talks to Gemini. That is not a convention to be polite about — a key
 * shipped in a Vite bundle is a key published to everyone who loads the page.
 *
 * Reads and the plain send go through axios, so they inherit the interceptors
 * that refresh an expired session. The streaming send cannot: it needs the raw
 * response body, which axios does not expose. It uses `fetch` and falls back to
 * the axios path on a 401, which is where the refresh lives.
 */

const BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;

/**
 * Which mount to use.
 *
 * The admin console signs its own tokens and reaches the same router under
 * `/admin`. This app is never the console, so the prefix is fixed — but it is
 * named here rather than inlined so the admin build can import the same module
 * with one value changed.
 */
const ROOT = '/assistant';

export const getStatus = () => api.get(`${ROOT}/status`).then(unwrap);

export const listConversations = () => api.get(`${ROOT}/conversations`).then(unwrap);

export const getConversation = (conversationId) =>
  api.get(`${ROOT}/conversations/${conversationId}`).then(unwrap);

export const deleteConversation = (conversationId) =>
  api.delete(`${ROOT}/conversations/${conversationId}`).then(unwrap);

/** One question, one whole answer. The fallback when streaming is unavailable. */
export const sendMessage = ({ message, conversationId }) =>
  api.post(`${ROOT}/messages`, { message, conversationId: conversationId || undefined }).then(unwrap);

/**
 * The same question, read as it is written.
 *
 * Server-sent events over a POST, so the body carries the question and the
 * Authorization header carries the session — which `EventSource` cannot do,
 * hence `fetch` rather than the browser's own SSE client.
 *
 * Returns the same shape as `sendMessage`, so a caller that does not care about
 * the streaming can await it and ignore `onChunk`.
 */
export async function streamMessage({ message, conversationId, onChunk, signal }) {
  const response = await fetch(`${BASE}${ROOT}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {})
    },
    credentials: 'include',
    body: JSON.stringify({ message, conversationId: conversationId || undefined }),
    signal
  });

  // A dead session is worth one retry through axios, which refreshes the token
  // and replays the request. Anything else is a real failure.
  if (response.status === 401) {
    return sendMessage({ message, conversationId });
  }

  if (!response.ok || !response.body) {
    // The backend answers a rejected request with the usual envelope even here,
    // because the failure happened before the stream started.
    const body = await response.json().catch(() => null);
    const error = new Error(body?.message || 'The assistant could not answer. Please try again.');
    error.status = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let result = null;
  let failure = null;

  // SSE frames are separated by a blank line, and a frame can be split across
  // reads — so the buffer is only consumed up to the last complete frame.
  const consume = () => {
    let index = buffer.indexOf('\n\n');

    while (index !== -1) {
      const frame = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);

      let event = 'message';
      const data = [];

      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trim());
      }

      if (data.length) {
        let payload;
        try {
          payload = JSON.parse(data.join('\n'));
        } catch {
          // A frame we cannot read is a frame we skip. One malformed event
          // must not end an answer that is otherwise arriving fine.
          payload = null;
        }

        if (payload) {
          if (event === 'chunk' && payload.text) onChunk?.(payload.text);
          if (event === 'done') result = payload;
          if (event === 'error') failure = payload.message;
        }
      }

      index = buffer.indexOf('\n\n');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    consume();
  }

  buffer += decoder.decode();
  consume();

  if (failure) throw new Error(failure);
  if (!result) throw new Error('The assistant stopped before finishing. Please try again.');

  return result;
}
