import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/complaints', { params }).then(unwrap);

export const counts = () => api.get('/admin/complaints/counts').then(unwrap);

export const detail = (complaintId) => api.get(`/admin/complaints/${complaintId}`).then(unwrap);

// { status?, priority?, assignedAdmin?, resolution? } — support changes these together.
export const update = (complaintId, payload) =>
  api.patch(`/admin/complaints/${complaintId}`, payload).then(unwrap);

/** Internal. The reporter never sees a note. */
export const addNote = (complaintId, note) =>
  api.post(`/admin/complaints/${complaintId}/notes`, { note }).then(unwrap);

/** A reply the reporter reads. */
export const reply = (complaintId, message) =>
  api.post(`/admin/complaints/${complaintId}/messages`, { message }).then(unwrap);
