import { api, unwrap } from './api';

/**
 * The rider's own money.
 *
 * No rider id appears in any of these paths: the server reads it from the
 * token, so there is nothing here that could be pointed at another rider's
 * wallet.
 */

export const getWallet = () => api.get('/riders/wallet').then(unwrap);

export const getLedger = (params = {}) => api.get('/riders/wallet/ledger', { params }).then(unwrap);

export const getRecharges = (params = {}) => api.get('/riders/wallet/recharges', { params }).then(unwrap);

/**
 * Opens a recharge and returns something to scan.
 *
 * The amount is checked against the platform minimum on the server. The app
 * checks it too, so the keypad can say why the button is off before a round
 * trip — but the server's answer is the one that counts.
 */
export const startRecharge = (amount) => api.post('/riders/wallet/recharge', { amount }).then(unwrap);

/**
 * Polled while the rider waits.
 *
 * This asks the payment provider whether the money arrived; it does not tell
 * the server that it did. Calling it repeatedly credits the balance once,
 * because the posting is keyed on the recharge.
 */
export const getRechargeStatus = (rechargeId) =>
  api.get(`/riders/wallet/recharge/${rechargeId}`).then(unwrap);

export const cancelRecharge = (rechargeId) =>
  api.post(`/riders/wallet/recharge/${rechargeId}/cancel`).then(unwrap);

/**
 * Stands in for the UPI app paying — development only.
 *
 * The endpoint behind this is mounted only when the server is not in
 * production, so in production this call has nowhere to land. It does not tell
 * the server a payment succeeded: it flips the sandbox provider's own record,
 * and the server then settles by asking that provider through the same path a
 * real gateway's answer takes. The ledger entry it produces is a real one.
 */
export const simulateRecharge = (rechargeId, outcome = 'PAID') =>
  api.post(`/riders/wallet/recharge/${rechargeId}/simulate`, { outcome }).then(unwrap);
