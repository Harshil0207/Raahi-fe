import { createContext } from 'react';

/**
 * In its own file so the provider module only exports a component — which is
 * what react-refresh needs to hot-reload it without dropping the session.
 */
export const AdminAuthContext = createContext(null);
