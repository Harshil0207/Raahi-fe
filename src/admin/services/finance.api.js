import { api, unwrap } from './api';

/**
 * Rider wallets and the platform ledger.
 *
 * Reading is behind `finance.read`; the two posts are behind `finance.adjust`
 * as well, which is the only permission in the system that can move a balance.
 */

// { range, from, to } — the same windows as the dashboard, see constants/ranges.js.
export const overview = (params) => api.get('/admin/finance/overview', { params }).then(unwrap);

// { page, limit, status, search, minOutstanding }
export const balances = (params) => api.get('/admin/finance/balances', { params }).then(unwrap);

// { page, limit, type, riderId, from, to } — every movement, across all riders.
export const ledger = (params) => api.get('/admin/finance/ledger', { params }).then(unwrap);

/** What is collecting money right now. Never includes a key or a secret. */
export const provider = () => api.get('/admin/finance/provider').then(unwrap);

export const riderFinance = (riderId) => api.get(`/admin/riders/${riderId}/finance`).then(unwrap);

export const riderLedger = (riderId, params) =>
  api.get(`/admin/riders/${riderId}/ledger`, { params }).then(unwrap);

/**
 * `{ direction, amount, reason, note? }`.
 *
 * The reason is not optional and the backend refuses a request without one, so
 * the dialog that calls this keeps its submit disabled until there is one.
 */
export const adjustBalance = (riderId, payload) =>
  api.post(`/admin/riders/${riderId}/balance/adjust`, payload).then(unwrap);

/** Recomputes the wallet from its ledger. Returns the drift, zero included. */
export const reconcile = (riderId) =>
  api.post(`/admin/riders/${riderId}/balance/reconcile`).then(unwrap);
