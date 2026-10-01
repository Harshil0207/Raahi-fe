import { api, unwrap } from './api';

/**
 * Reads the conversation between a customer and their rider.
 *
 * Every call is recorded in the audit log by the backend. That is the point:
 * support can look when there is a dispute, and the fact that they looked is
 * permanent.
 */
export const forRide = (rideId) => api.get(`/admin/rides/${rideId}/chat`).then(unwrap);
