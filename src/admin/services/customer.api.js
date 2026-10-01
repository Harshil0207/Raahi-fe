import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/customers', { params }).then(unwrap);

export const detail = (userId) => api.get(`/admin/customers/${userId}`).then(unwrap);

export const update = (userId, payload) => api.patch(`/admin/customers/${userId}`, payload).then(unwrap);

export const setBlocked = (userId, blocked, reason) =>
  api.post(`/admin/customers/${userId}/block`, { blocked, reason }).then(unwrap);
