import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/riders', { params }).then(unwrap);

export const detail = (riderId) => api.get(`/admin/riders/${riderId}`).then(unwrap);

/** The rider id for a user account, so a complaint or ride can link through. */
export const byUser = (userId) => api.get(`/admin/riders/by-user/${userId}`).then(unwrap);

export const forceOffline = (riderId, reason) =>
  api.post(`/admin/riders/${riderId}/offline`, { reason }).then(unwrap);

// A rider's account is a User, so these use the rider-scoped account routes.
export const updateAccount = (userId, payload) =>
  api.patch(`/admin/rider-accounts/${userId}`, payload).then(unwrap);

export const setBlocked = (userId, blocked, reason) =>
  api.post(`/admin/rider-accounts/${userId}/block`, { blocked, reason }).then(unwrap);
