import { api, unwrap } from './api';

/** Complaints, from the reporter's side. Customers and riders share these. */

/** The categories the platform currently offers this role. */
export const categories = () => api.get('/complaints/categories').then(unwrap);

// { rideId?, category, subject, description, priority? }
export const create = (payload) => api.post('/complaints', payload).then(unwrap);

export const list = (params = {}) => api.get('/complaints', { params }).then(unwrap);

export const detail = (complaintId) => api.get(`/complaints/${complaintId}`).then(unwrap);

export const reply = (complaintId, message) =>
  api.post(`/complaints/${complaintId}/messages`, { message }).then(unwrap);

export const unread = () => api.get('/complaints/unread').then(unwrap);
