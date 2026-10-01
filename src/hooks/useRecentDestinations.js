import { useEffect, useMemo, useState } from 'react';
import * as rideApi from '@/services/ride.api';
import { RIDE_STATUS } from '@/constants/ride';
import { pointToLatLng } from '@/utils/geo';

/**
 * Destinations the customer has actually been to, taken from their completed
 * rides. Nothing here is invented: an account with no history shows nothing.
 */
export function useRecentDestinations(max = 4) {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    let cancelled = false;

    rideApi
      .listRides({ status: RIDE_STATUS.COMPLETED, limit: 20 })
      .then((data) => !cancelled && setRides(data.rides))
      // A failed history fetch just means no shortcuts; the booking form still works.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const seen = new Set();
    const out = [];

    for (const ride of rides) {
      const place = ride.destination;
      const coords = pointToLatLng(place?.location);
      if (!place?.address || !coords) continue;

      const key = place.placeId || place.address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        address: place.address,
        placeId: place.placeId,
        lat: coords.lat,
        lng: coords.lng,
        lastUsedAt: ride.completedAt || ride.createdAt
      });

      if (out.length === max) break;
    }

    return out;
  }, [rides, max]);
}
