import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/admins', { params }).then(unwrap);

/** The real role/permission matrix, so the console never hard-codes it. */
export const permissions = () => api.get('/admin/admins/permissions').then(unwrap);

export const activity = (adminId) => api.get(`/admin/admins/${adminId}/activity`).then(unwrap);

export const create = (payload) => api.post('/admin/admins', payload).then(unwrap);

export const update = (adminId, payload) => api.patch(`/admin/admins/${adminId}`, payload).then(unwrap);

export const resetPassword = (adminId, newPassword) =>
  api.post(`/admin/admins/${adminId}/password`, { newPassword }).then(unwrap);
