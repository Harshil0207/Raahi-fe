import { useEffect, useState } from 'react';
import * as complaintApi from '@/admin/services/complaint.api';
import { useAuth } from './useAuth';
import { PERMISSIONS } from '@/admin/constants/permissions';

/**
 * The open-complaint count for the sidebar badge.
 *
 * Polled on a slow interval rather than pushed: the number only has to be
 * roughly current, and one small aggregate every minute is cheaper than holding
 * a socket subscription open for a badge.
 */
export function useComplaintCounts(intervalMs = 60_000) {
  const { can } = useAuth();
  const allowed = can(PERMISSIONS.COMPLAINTS_READ);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!allowed) return undefined;

    let cancelled = false;
    const load = () =>
      complaintApi
        .counts()
        .then((result) => !cancelled && setCounts(result))
        .catch(() => {});

    load();
    const id = setInterval(load, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [allowed, intervalMs]);

  return counts;
}
