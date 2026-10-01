import axios from 'axios';

/**
 * The single axios instance every admin API module uses.
 *
 * The admin session is a short-lived bearer token with no refresh flow, which is
 * the right trade for an operations console: an operator signs in at the start
 * of a shift, and a console that silently keeps itself signed in forever is a
 * console left open on an unattended machine. On a 401 the token is dropped and
 * the app returns to the sign-in screen.
 *
 * The token is held in memory and mirrored to sessionStorage rather than
 * localStorage, so closing the tab ends the session.
 */

/**
 * Where the API is, worked out from where this page is being served.
 *
 * THIS USED TO BE A LAN IP WRITTEN INTO THE SOURCE — `http://192.168.1.8:5000`.
 * Two things were wrong with that. A home router hands out addresses on a
 * lease, so the day that lease changes the console cannot reach the API and
 * says the backend is down when the backend is fine. And because the console
 * had no `.env`, the only way to correct it was to edit this file.
 *
 * Reading the hostname off the page makes it right by construction: open the
 * console at localhost and it calls localhost, open it from a phone at the
 * machine's LAN address and it calls that same address. Nothing to keep in
 * sync, and no address to go stale.
 *
 * `VITE_API_URL` still wins when it is set, which is what a deployed console
 * uses — there the API is on its own host and is not a port on this one.
 */
const apiOrigin = () => {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000/api/v1`;
};

const BASE_URL = import.meta.env.VITE_API_URL || apiOrigin();
const TOKEN_KEY = 'raahi.admin.token';

let accessToken = null;
const listeners = new Set();

function readStored() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing or blocked storage: the session lives in memory only.
    return null;
  }
}

accessToken = readStored();

export function getToken() {
  return accessToken;
}

export function setToken(token) {
  accessToken = token || null;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Not fatal; the token still works for this tab.
  }
  listeners.forEach((listener) => listener(accessToken));
}

/** Notified when the session ends, so the app can navigate to sign-in. */
export function onSessionChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30_000
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/**
 * Normalises every failure into one Error shape, so no screen has to know what
 * axios does with a network error versus an HTTP error.
 *
 * `fields` carries the backend's per-field validation messages, which is what
 * lets a settings form show the problem next to the input that caused it.
 */
function normaliseError(error) {
  const response = error.response;

  if (!response) {
    const offline = new Error(
      error.code === 'ECONNABORTED'
        ? 'The request took too long. The API may be under load.'
        : 'Cannot reach the API. Check that the backend is running.'
    );
    offline.status = 0;
    offline.fields = {};
    return offline;
  }

  const body = response.data || {};
  const wrapped = new Error(body.message || `Request failed (${response.status})`);
  wrapped.status = response.status;

  // The backend sends [{ field, message }]; screens want it keyed by field.
  wrapped.fields = Array.isArray(body.errors)
    ? body.errors.reduce((acc, item) => {
        if (item?.field) acc[item.field] = item.message;
        return acc;
      }, {})
    : {};

  return wrapped;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const wrapped = normaliseError(error);

    // The session is gone. Drop it here rather than in each screen, so one
    // expired token cannot leave half the console showing stale data.
    if (wrapped.status === 401 && accessToken) setToken(null);

    return Promise.reject(wrapped);
  }
);

/** The backend's envelope is { success, message, data }; screens want data. */
export const unwrap = (response) => response.data?.data;
