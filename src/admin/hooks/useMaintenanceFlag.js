import { useEffect, useState } from 'react';
import { api, unwrap } from '@/admin/services/api';

/**
 * Whether the platform is paused.
 *
 * Read from the public settings endpoint, which needs no permission — an
 * operator without settings.read still needs to know why no rides are coming in.
 */
export function useMaintenanceFlag(intervalMs = 60_000) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api
        .get('/settings')
        .then(unwrap)
        .then((result) => !cancelled && setOn(Boolean(result?.maintenanceMode)))
        .catch(() => {});

    load();
    const id = setInterval(load, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return on;
}
