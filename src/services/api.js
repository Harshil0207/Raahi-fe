import axios from 'axios';

/**
 * Where the API is, worked out from where this page is being served, so the
 * same build works at localhost and from a phone on the same network without
 * an address being written down anywhere. `VITE_API_URL` still wins when set.
 */
const apiOrigin = () => {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000/api/v1`;
};

const BASE_URL = import.meta.env.VITE_API_URL || apiOrigin();

/**
 * The backend takes the access token as a Bearer header and keeps the refresh
 * token in an httpOnly cookie scoped to /api/v1/auth, so `withCredentials` is
 * what makes refresh work — the refresh token itself is never touched by JS.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000
});

const ACCESS_TOKEN_KEY = 'raahi.accessToken';

/**
 * A note that this browser has had a session at some point.
 *
 * The refresh token lives in an httpOnly cookie, so JavaScript cannot see
 * whether one exists. Without this marker, start-up had to POST /auth/refresh
 * on every first load to find out — including for somebody who has never
 * signed in, for whom it is a guaranteed 401 on a public page.
 *
 * Cleared on sign-out, not when an access token merely expires: an expired
 * token is exactly the case a refresh is for.
 */
const HAD_SESSION_KEY = 'raahi.hadSession';

let accessToken = null;
let onSessionLost = null;

export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      rememberSession(true);
    } else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Private mode or blocked storage: the session still works for this tab.
  }
}

/** Records, or forgets, that this browser has signed in. */
export function rememberSession(had) {
  try {
    if (had) localStorage.setItem(HAD_SESSION_KEY, '1');
    else localStorage.removeItem(HAD_SESSION_KEY);
  } catch {
    // Blocked storage: `mayHaveSession` then says no and start-up simply skips
    // the probe. The person signs in, which is what they would do anyway.
  }
}

/** Whether a refresh is worth attempting on start-up. */
export function mayHaveSession() {
  try {
    return localStorage.getItem(HAD_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function getAccessToken() {
  if (accessToken) return accessToken;
  try {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    accessToken = null;
  }
  return accessToken;
}

export function onUnauthenticated(handler) {
  onSessionLost = handler;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A single refresh is shared by every request that got a 401 at the same moment,
// otherwise a screen with three parallel calls would rotate the token three times
// and invalidate its own session.
let refreshing = null;

function refreshSession() {
  refreshing =
    refreshing ||
    api
      .post('/auth/refresh', {})
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });

  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    // Never try to refresh the refresh call itself.
    const isAuthCall = config?.url?.includes('/auth/refresh') || config?.url?.includes('/auth/login');

    if (response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        setAccessToken(null);
        onSessionLost?.();
      }
    }

    return Promise.reject(normaliseError(error));
  }
);

/**
 * Turns anything axios throws into a predictable shape. Backend stack traces are
 * dropped here so nothing internal reaches the UI.
 */
export function normaliseError(error) {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;

  const shaped = new Error(body?.message || fallbackMessage(status, error));
  shaped.status = status;
  shaped.fields = {};
  shaped.code = error.code;

  if (Array.isArray(body?.errors)) {
    body.errors.forEach(({ field, message }) => {
      if (field && !shaped.fields[field]) shaped.fields[field] = message;
    });
  }

  return shaped;
}

function fallbackMessage(status, error) {
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (!status) return 'Cannot reach the server. Check that the backend is running.';
  if (status === 403) return 'You are not allowed to do that.';
  if (status === 404) return 'Not found.';
  if (status >= 500) return 'Something went wrong on the server.';
  return 'Request failed.';
}

// Every backend response is { success, message, data }.
export const unwrap = (response) => response.data.data;
