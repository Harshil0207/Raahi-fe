import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/rides', { params }).then(unwrap);

export const detail = (rideId) => api.get(`/admin/rides/${rideId}`).then(unwrap);

export const cancel = (rideId, reason) => api.post(`/admin/rides/${rideId}/cancel`, { reason }).then(unwrap);
