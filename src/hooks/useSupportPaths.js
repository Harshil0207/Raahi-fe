import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { ROLES } from '@/constants/ride';

/**
 * Where the support screens live for the signed-in role.
 *
 * The three screens are shared between customers and riders, but they sit under
 * different path prefixes so each role's back button and tab bar stay coherent.
 * Rather than duplicating the pages, they ask for their own paths.
 */
export function useSupportPaths() {
  const { role } = useAuth();

  return useMemo(() => {
    const rider = role === ROLES.RIDER;
    const base = rider ? '/rider/support' : '/support';

    return {
      base,
      help: rider ? '/rider/help' : '/help',
      create: `${base}/new`,
      detail: (complaintId) => `${base}/${complaintId}`,
      /** Where a trip link should go for this role. */
      ride: (rideId) => (rider ? `/rider/rides` : `/rides/${rideId}`)
    };
  }, [role]);
}
