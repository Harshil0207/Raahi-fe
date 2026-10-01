import { api, unwrap } from './api';

/**
 * The slice of platform configuration the apps are allowed to know: whether
 * maintenance is on, which payment methods are accepted, the complaint
 * categories, and the support contact details shown on the help screen.
 *
 * Unauthenticated, because the login screen needs the maintenance flag before
 * anyone has signed in.
 */
export const publicSettings = () => api.get('/settings').then(unwrap);
