import { createContext } from 'react';

/** Kept apart from the provider so the provider file only exports a component. */
export const AuthContext = createContext(null);
