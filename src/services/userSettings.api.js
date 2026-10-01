import { api, unwrap } from './api';

/**
 * The signed-in person's own preferences.
 *
 * Under `/users/me`, not `/settings` — that path is the platform's public
 * configuration (maintenance mode, the service catalogue) and is a different
 * thing entirely. There is no user id in either call: the server takes the
 * person from the token.
 */
export const getSettings = () => api.get('/users/me/settings').then(unwrap);

export const updateSettings = (group, patch) => api.patch(`/users/me/settings/${group}`, patch).then(unwrap);
