import { api, unwrap } from './api';

export const list = (params) => api.get('/admin/audit-logs', { params }).then(unwrap);
