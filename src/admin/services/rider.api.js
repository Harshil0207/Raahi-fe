import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/riders', { params }).then(unwrap);

export const detail = (riderId) => api.get(`/admin/riders/${riderId}`).then(unwrap);

/** The rider id for a user account, so a complaint or ride can link through. */
export const byUser = (userId) => api.get(`/admin/riders/by-user/${userId}`).then(unwrap);

export const forceOffline = (riderId, reason) =>
  api.post(`/admin/riders/${riderId}/offline`, { reason }).then(unwrap);

/**
 * Approves, rejects or re-opens a rider's application.
 *
 * `note` is required by the server on a REJECTED decision and is shown to the
 * rider, so a refusal is never just "no". The server also takes a rejected
 * rider off the road straight away, and refuses outright if they are mid-ride —
 * so a failure here is a real answer, not something to retry.
 */
export const setVerification = (riderId, status, note) =>
  api.post(`/admin/riders/${riderId}/verification`, { status, note }).then(unwrap);

// A rider's account is a User, so these use the rider-scoped account routes.
export const updateAccount = (userId, payload) =>
  api.patch(`/admin/rider-accounts/${userId}`, payload).then(unwrap);

export const setBlocked = (userId, blocked, reason) =>
  api.post(`/admin/rider-accounts/${userId}/block`, { blocked, reason }).then(unwrap);
