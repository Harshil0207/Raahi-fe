import { api, unwrap } from './api';

// pickup/destination: { address, placeId?, lat, lng }
/**
 * `{ pickup, destination, serviceType, parcel? }`.
 *
 * Only the service is sent. The rate, the distance and the fare are the
 * server's, which is why none of them appear here.
 */
export const createRide = (payload) => api.post('/rides', payload).then(unwrap);

export const listRides = (params = {}) => api.get('/rides', { params }).then(unwrap);

export const getRide = (rideId) => api.get(`/rides/${rideId}`).then(unwrap);

/**
 * `reasonCode` is checked against the caller's own list on the server, and the
 * fee is worked out there too — nothing about either is decided here.
 */
export const cancelRide = (rideId, { reasonCode, note } = {}) =>
  api.post(`/rides/${rideId}/cancel`, { reasonCode, note }).then(unwrap);

// Customer-only. The rider never sees the code, only submits it.
export const getRideOtp = (rideId) => api.get(`/rides/${rideId}/otp`).then(unwrap);

export const getRiderLocation = (rideId) => api.get(`/rides/${rideId}/rider-location`).then(unwrap);

// Rider-driven lifecycle
export const markArriving = (rideId) => api.post(`/rides/${rideId}/arriving`).then(unwrap);

export const markArrived = (rideId) => api.post(`/rides/${rideId}/arrived`).then(unwrap);

export const verifyOtp = (rideId, otp) => api.post(`/rides/${rideId}/verify-otp`, { otp }).then(unwrap);

export const startRide = (rideId) => api.post(`/rides/${rideId}/start`).then(unwrap);

export const completeRide = (rideId, body = {}) => api.post(`/rides/${rideId}/complete`, body).then(unwrap);

// Customer rates a completed ride; feeds the rider's running average.
export const rateRide = (rideId, { rating, comment, categories } = {}) =>
  api.post(`/rides/${rideId}/rate`, { rating, comment, categories }).then(unwrap);

// The other direction. One per ride, same as the customer's, and only after it
// has been completed — both rules are enforced on the server.
export const rateCustomer = (rideId, { rating, comment, categories } = {}) =>
  api.post(`/rides/${rideId}/rate-customer`, { rating, comment, categories }).then(unwrap);

/**
 * Asking again after a round of offers expired with nobody accepting.
 *
 * `serviceType` is optional and is the only thing the customer may change. The
 * fare that comes back is the server's, computed from the current pricing — the
 * app never sends a price and never decides one.
 */
export const requestAgain = (rideId, serviceType = null) =>
  api.post(`/rides/${rideId}/request-again`, serviceType ? { serviceType } : {}).then(unwrap);

/** What this ride could be switched to, priced for its distance. */
export const getChangeOptions = (rideId) => api.get(`/rides/${rideId}/change-options`).then(unwrap);
