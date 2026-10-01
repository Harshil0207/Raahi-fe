import { api, unwrap } from './api';

// Returns { notifications, unread }.
export const listNotifications = (params = {}) => api.get('/notifications', { params }).then(unwrap);

export const markRead = (id) => api.post(`/notifications/${id}/read`).then(unwrap);

export const markAllRead = () => api.post('/notifications/read-all').then(unwrap);
