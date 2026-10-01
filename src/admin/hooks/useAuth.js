import { useContext } from 'react';
import { AdminAuthContext } from '@/admin/store/auth-context';

export function useAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
