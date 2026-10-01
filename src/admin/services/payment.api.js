import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/payments', { params }).then(unwrap);

export const detail = (paymentId) => api.get(`/admin/payments/${paymentId}`).then(unwrap);

/**
 * Cash only. UPI settlement comes from the gateway; the backend refuses to mark
 * one paid from here, because that would be recording money that never moved.
 */
export const settleCash = (paymentId, note) =>
  api.post(`/admin/payments/${paymentId}/settle-cash`, { note }).then(unwrap);

/**
 * Which gateway is live, how it is configured, and how it is doing.
 *
 * Carries no secret. The backend builds this from the provider's own
 * `describe()`, which returns the client id truncated to a hint and nothing
 * else — there is no route that will hand a client secret or a webhook password
 * to this console, deliberately.
 */
export const overview = () => api.get('/admin/payments-overview').then(unwrap);

/**
 * Asks the gateway to send a fare back.
 *
 * This records a request, not a refund. The money has not moved when this
 * resolves, and the ledger does not move either — that happens once the gateway
 * confirms, through the reconcile call below or a callback.
 */
export const refund = (paymentId, { amount, reason }) =>
  api.post(`/admin/payments/${paymentId}/refund`, { amount, reason }).then(unwrap);

/** Re-asks the gateway what became of a refund, and posts the reversal if it is done. */
export const reconcileRefund = (paymentId) =>
  api.post(`/admin/payments/${paymentId}/refund/reconcile`).then(unwrap);
