import { api, unwrap } from './api';

export const getProfile = () => api.get('/riders/profile').then(unwrap);

export const updateProfile = (payload) => api.patch('/riders/profile', payload).then(unwrap);

export const setOnline = (isOnline) => api.patch('/riders/status', { isOnline }).then(unwrap);

// The backend throttles idle writes, so calling this often is cheap.
export const pushLocation = (position) => api.post('/riders/location', position).then(unwrap);

// Live offers only — the backend filters out anything past its expiry.
export const listRideRequests = () => api.get('/riders/ride-requests').then(unwrap);

export const acceptRequest = (requestId) =>
  api.post(`/riders/ride-requests/${requestId}/accept`).then(unwrap);

export const rejectRequest = (requestId) =>
  api.post(`/riders/ride-requests/${requestId}/reject`).then(unwrap);

export const getActiveRide = () => api.get('/riders/active-ride').then(unwrap);

/**
 * Aggregates computed server-side from completed rides and their payments.
 *
 * Returns today / week / month / allTime totals, the selected window (`range`)
 * with a breakdown by service and by passenger-versus-parcel work, a daily
 * breakdown for the chart, and the most recent trips. Nothing is added up in
 * the app — every figure on the screen comes back from the aggregation.
 *
 * Filters: `range` (today | week | month | last7 | last30 | all | custom),
 * `from` / `to` as `YYYY-MM-DD` whole local days, `serviceType`, `method`.
 * `days` is the width of the chart only, 7 to 90.
 */
export const getEarnings = (params = {}) => api.get('/riders/earnings', { params }).then(unwrap);

// Lifetime performance. Rates come back null when there is not enough data.
export const getStats = () => api.get('/riders/stats').then(unwrap);
