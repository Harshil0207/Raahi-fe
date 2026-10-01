import { api, unwrap } from './api';

export const getPayment = (rideId) => api.get(`/payments/${rideId}`).then(unwrap);

/** Which methods the platform is accepting, and why one is off if it is. */
export const getMethodOptions = () => api.get('/payments/options').then(unwrap);

/**
 * The customer's own choice.
 *
 * No longer called from anywhere in the app: choosing the method is the rider's
 * job at the drop-off, and offering it to both sides meant two people answering
 * the same question. The endpoint and this wrapper stay because the backend
 * still supports both methods and something else may legitimately need it —
 * deleting the client's half of a working API to reflect one screen's decision
 * is not the same as removing the capability.
 */
export const selectMethod = (rideId, method) =>
  api.post(`/payments/${rideId}/method`, { method }).then(unwrap);

/** The rider's choice, made at the drop-off. */
export const setRiderMethod = (rideId, method) =>
  api.post(`/payments/${rideId}/rider-method`, { method }).then(unwrap);

/**
 * Opens a UPI collection and returns a QR to show the customer.
 *
 * Calling it twice reuses the order already open rather than creating a second
 * one, so a reloaded screen is not collecting the same fare through two
 * different references.
 */
export const startUpi = (rideId) => api.post(`/payments/${rideId}/upi`).then(unwrap);

/**
 * Asks the server to re-check with the payment provider.
 *
 * This is the only route from "the customer says they paid" to a settled ride,
 * and it does not carry an answer — it asks for one. There is deliberately no
 * endpoint anywhere that lets a rider mark a UPI payment as received.
 */
export const getPaymentStatus = (rideId) => api.get(`/payments/${rideId}/status`).then(unwrap);

// The rider confirms cash, because they are the one handed the money. It is the
// one payment a person can settle by saying so, because no system can watch a
// banknote change hands.
export const collectCash = (rideId) => api.post(`/payments/${rideId}/collect-cash`).then(unwrap);

/**
 * The customer starting their own payment.
 *
 * Only the ride is sent. The amount, the rider and the status are all read
 * server-side — there is no parameter here that could tell the backend what
 * this ride costs, which is the point.
 */
export const startCheckout = (rideId) => api.post(`/payments/${rideId}/checkout`).then(unwrap);

/** One payment's authoritative status, for the screen the gateway returns to. */
export const getPaymentById = (paymentId) => api.get(`/payments/${paymentId}/status`).then(unwrap);

/**
 * The signed-in person's own payments.
 *
 * Takes no customer or rider id, because the server scopes it to whoever the
 * token belongs to. There is nothing to pass here that could make it somebody
 * else's history.
 */
export const listMyPayments = ({ page = 1, limit = 20 } = {}) =>
  api.get('/payments/mine', { params: { page, limit } }).then(unwrap);
