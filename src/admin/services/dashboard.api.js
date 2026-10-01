import { api, unwrap } from './api';

// Every call takes { range, from, to } — see constants/ranges.js.
export const summary = (params) => api.get('/admin/dashboard/summary', { params }).then(unwrap);

export const series = (params) => api.get('/admin/dashboard/series', { params }).then(unwrap);

export const activeRides = (params) => api.get('/admin/dashboard/active-rides', { params }).then(unwrap);

export const topRiders = (params) => api.get('/admin/dashboard/top-riders', { params }).then(unwrap);
