import { useCallback, useEffect, useRef, useState } from 'react';
import * as rideApi from '@/services/ride.api';
import { joinRide } from '@/socket/ride.socket';
import { useSocketEvents, useSocketStatus } from './useSocket';
import { SOCKET_EVENTS } from '@/constants/socketEvents';
import { isActive, RIDE_STATUS } from '@/constants/ride';

const EMPTY = { ride: null, error: null, forId: null };

/**
 * One ride, kept current from sockets with REST as the source of truth.
 *
 * Socket payloads are deliberately partial (a status and a timestamp), so they
 * patch the local copy for an instant response and then trigger a refetch. The
 * server stays authoritative; the socket only decides *when* to look.
 */
export function useRide(rideId) {
  // Keeping the id that produced the data alongside it means `loading` is
  // derived rather than a second state that has to be kept in step.
  const [state, setState] = useState(EMPTY);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!rideId) return null;

    try {
      const data = await rideApi.getRide(rideId);
      if (mountedRef.current) setState({ ride: data, error: null, forId: rideId });
      return data;
    } catch (err) {
      if (mountedRef.current) setState({ ride: null, error: err, forId: rideId });
      return null;
    }
  }, [rideId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Ride-room membership is re-established on every reconnect by joinRide.
  useEffect(() => {
    if (!rideId) return;
    return joinRide(rideId);
  }, [rideId]);

  /**
   * Catch up after a reconnect.
   *
   * Re-joining the room restores future events, but says nothing about the
   * ones that happened while the socket was down — a rider may have accepted,
   * or the round may have expired, during those seconds. Without this the
   * screen keeps showing whatever it last heard until the next event arrives,
   * which for an expired search is never.
   *
   * Only the upward transition refetches. `connected` is true on first render
   * too, and refetching there would duplicate the initial load.
   */
  const connected = useSocketStatus();
  const wasConnected = useRef(connected);
  useEffect(() => {
    const reconnected = connected && !wasConnected.current;
    wasConnected.current = connected;
    if (reconnected && rideId) refetch();
  }, [connected, rideId, refetch]);

  const patch = useCallback((changes) => {
    setState((current) => (current.ride ? { ...current, ride: { ...current.ride, ...changes } } : current));
  }, []);

  const onRideEvent = useCallback(
    (payload) => {
      if (payload?.rideId && String(payload.rideId) !== String(rideId)) return;
      // Only a real ride status is allowed to become the ride's status. Every
      // lifecycle event carries one; anything else is a different kind of
      // status that happens to share the field name.
      if (payload?.status && RIDE_STATUS[payload.status]) patch({ status: payload.status });
      refetch();
    },
    [rideId, patch, refetch]
  );

  /**
   * A payment moving is not the ride moving.
   *
   * `payment:updated` carries the *payment's* status — PENDING, PROCESSING,
   * PAID — and this used to be handled by `onRideEvent`, which wrote it
   * straight onto `ride.status`. Opening a UPI collection emits PROCESSING, so
   * the ride's status became a value no branch recognises: the rider's
   * collection sheet unmounted mid-flow, taking the freshly generated QR code
   * with it, and the refetch a moment later brought the sheet back with no QR
   * and no error. That is why the code "appeared and vanished".
   *
   * The ride's own status travels on this event as `rideStatus`, which is what
   * is used here.
   */
  const onPaymentEvent = useCallback(
    (payload) => {
      if (payload?.rideId && String(payload.rideId) !== String(rideId)) return;
      if (payload?.rideStatus && RIDE_STATUS[payload.rideStatus]) {
        patch({ status: payload.rideStatus });
      }
      refetch();
    },
    [rideId, patch, refetch]
  );

  /**
   * The round of asking riders is over.
   *
   * Guarded on the ride like every other handler, so a late expiry belonging
   * to an earlier round cannot blank a search that has already been restarted.
   * The server guards this too — it withholds the event entirely while a newer
   * round is still live — and this is the second line, because the client is
   * the side that knows which ride it is currently showing.
   *
   * It only refetches. Whether the search is over is then derived from the
   * ride's own `searchExpiresAt`, which is the server's answer, rather than
   * from having seen an event: that is what makes a page refresh and a missed
   * event land in the same place.
   */
  const onSearchEnded = useCallback(
    (payload) => {
      if (payload?.rideId && String(payload.rideId) !== String(rideId)) return;
      refetch();
    },
    [rideId, refetch]
  );

  useSocketEvents(
    {
      [SOCKET_EVENTS.RIDE_EXPIRED]: onSearchEnded,
      [SOCKET_EVENTS.RIDE_NO_RIDERS]: onSearchEnded,
      [SOCKET_EVENTS.RIDE_ACCEPTED]: onRideEvent,
      [SOCKET_EVENTS.RIDE_ARRIVING]: onRideEvent,
      [SOCKET_EVENTS.RIDE_ARRIVED]: onRideEvent,
      [SOCKET_EVENTS.RIDE_STARTED]: onRideEvent,
      [SOCKET_EVENTS.RIDE_COMPLETED]: onRideEvent,
      [SOCKET_EVENTS.RIDE_CANCELLED]: onRideEvent,
      [SOCKET_EVENTS.PAYMENT_UPDATED]: onPaymentEvent
    },
    [onRideEvent, onPaymentEvent, onSearchEnded]
  );

  const settled = state.forId === rideId;

  return {
    ride: settled ? state.ride : null,
    error: settled ? state.error : null,
    loading: Boolean(rideId) && !settled,
    refetch,
    patch,
    isActive: settled && state.ride ? isActive(state.ride.status) : false
  };
}

/**
 * The customer's current ride, if any. Used to bounce Home straight into
 * tracking when a ride is already running.
 */
export function useActiveCustomerRide() {
  const [result, setResult] = useState({ ride: null, loaded: false });

  const load = useCallback(async () => {
    try {
      const { rides } = await rideApi.listRides({ limit: 5 });
      setResult({ ride: rides.find((r) => isActive(r.status)) || null, loaded: true });
    } catch {
      setResult({ ride: null, loaded: true });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ride: result.ride, loading: !result.loaded, reload: load };
}
