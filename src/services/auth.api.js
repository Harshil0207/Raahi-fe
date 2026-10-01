import { api, unwrap } from './api';

export const register = (payload) => api.post('/auth/register', payload).then(unwrap);

export const login = (credentials) => api.post('/auth/login', credentials).then(unwrap);

export const refresh = () => api.post('/auth/refresh', {}).then(unwrap);

export const logout = () => api.post('/auth/logout', {}).then(unwrap);

// Returns { user, rider } — rider is null for customers.
export const me = () => api.get('/auth/me').then(unwrap);

export const updateProfile = (payload) => api.patch('/users/me', payload).then(unwrap);

/**
 * Which sign-in methods this deployment offers, and the Google client id.
 *
 * Read from the backend rather than from a Vite variable so there is one place
 * to configure it and the button cannot appear on a server that has no idea
 * what to do with the token it would produce.
 */
export const providers = () => api.get('/auth/providers').then(unwrap);

/**
 * Exchanges a Google ID token for a Raahi session.
 *
 * The token is all that is sent. Not the email, not the name, not the Google
 * id — the backend reads those out of the token after verifying Google signed
 * it, which is what stops anyone signing in as anybody by typing an address.
 */
export const google = (payload) => api.post('/auth/google', payload).then(unwrap);

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then(unwrap);

export const resetPassword = (payload) => api.post('/auth/reset-password', payload).then(unwrap);

export const verifyEmail = (token) => api.post('/auth/verify-email', { token }).then(unwrap);

export const resendVerification = () => api.post('/auth/resend-verification', {}).then(unwrap);

/** Supplies the vehicle and licence a Google rider signed up without. */
export const riderOnboarding = (payload) => api.post('/riders/onboarding', payload).then(unwrap);
