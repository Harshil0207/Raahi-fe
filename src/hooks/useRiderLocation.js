import { useEffect, useRef, useState } from 'react';
import * as riderApi from '@/services/rider.api';
import { pushLocationOverSocket } from '@/socket/ride.socket';
import { useGeolocation } from './useGeolocation';
import { distanceKm } from '@/utils/geo';

// Below this, the rider has not really moved — usually just GPS noise.
const MIN_MOVE_KM = 0.02;
const IDLE_INTERVAL_MS = 15000;
const ACTIVE_INTERVAL_MS = 5000;

/**
 * Streams the rider's position while they are online, and more often while they
 * are on a ride. Sends over the socket when connected and falls back to REST,
 * skipping updates that would not move the marker — the backend throttles its
 * own writes too, this just avoids the round trip.
 */
export function useRiderLocation({ enabled, onActiveRide = false }) {
  const { position, status, error, request, isDenied, isInsecure, canPrompt, isLocating, supported } =
    useGeolocation({ watch: enabled, enabled });

  const [lastSentAt, setLastSentAt] = useState(null);
  const lastSentRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !position) return;

    const interval = onActiveRide ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    const previous = lastSentRef.current;

    const movedEnough = !previous || distanceKm(previous.position, position) >= MIN_MOVE_KM;
    const dueAnyway = !previous || Date.now() - previous.at >= interval;

    if ((!movedEnough && !dueAnyway) || sendingRef.current) return;

    const payload = {
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy,
      heading: position.heading,
      speed: position.speed
    };

    sendingRef.current = true;
    lastSentRef.current = { position, at: Date.now() };

    const finish = () => {
      sendingRef.current = false;
      setLastSentAt(Date.now());
    };

    if (pushLocationOverSocket(payload)) {
      finish();
    } else {
      riderApi
        .pushLocation(payload)
        .catch(() => {
          // Allow an immediate retry on the next fix rather than going quiet.
          lastSentRef.current = previous;
        })
        .finally(finish);
    }
  }, [enabled, position, onActiveRide]);

  // Going offline should not leave a stale "last sent" reading on screen, so it
  // is derived from `enabled` rather than cleared in an effect.
  return {
    position,
    status,
    error,
    request,
    isDenied,
    isInsecure,
    canPrompt,
    isLocating,
    supported,
    lastSentAt: enabled ? lastSentAt : null
  };
}
