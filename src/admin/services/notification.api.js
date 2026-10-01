import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/notifications', { params }).then(unwrap);

/** audience: 'customers' | 'riders' | 'all'. Reaches the in-app feed only. */
export const broadcast = (payload) => api.post('/admin/notifications/broadcast', payload).then(unwrap);
