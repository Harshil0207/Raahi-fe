import { api, unwrap } from './api';

// Device location for any signed-in user; used to default the pickup point.
export const saveLocation = (position) => api.post('/location', position).then(unwrap);

export const getCurrentLocation = () => api.get('/location/current').then(unwrap);
