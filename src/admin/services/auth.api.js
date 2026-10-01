import { api, unwrap, setToken } from './api';

export async function login(credentials) {
  const result = await api.post('/admin/auth/login', credentials).then(unwrap);
  setToken(result.accessToken);
  return result.admin;
}

export const me = () => api.get('/admin/auth/me').then(unwrap);

export const changePassword = (payload) =>
  api.post('/admin/auth/change-password', payload).then(unwrap);

export const updateProfile = (payload) => api.patch('/admin/auth/profile', payload).then(unwrap);

/** There is no server-side admin session to revoke, so signing out is local. */
export function logout() {
  setToken(null);
}
