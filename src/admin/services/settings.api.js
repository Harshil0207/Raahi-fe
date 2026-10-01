import { api, unwrap } from './api';

export const all = () => api.get('/admin/settings').then(unwrap);

/**
 * Patches one group. The backend refuses keys outside the named group, so a
 * request to /settings/fare cannot reach maintenance mode.
 */
export const updateGroup = (group, patch) => api.patch(`/admin/settings/${group}`, patch).then(unwrap);
