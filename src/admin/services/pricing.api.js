import { api, unwrap } from './api';

/**
 * Service pricing. A view over the `services` settings group with its own
 * screen, so the console edits one service at a time rather than twenty-four
 * rows in a list.
 */

export const all = () => api.get('/admin/settings/pricing').then(unwrap);

/** `{ ratePerKm?, enabled?, minimumFare?, maximumFare? }` — each optional. */
export const update = (serviceType, patch) =>
  api.patch(`/admin/settings/pricing/${serviceType}`, patch).then(unwrap);
