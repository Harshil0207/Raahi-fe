import { useCallback, useEffect, useRef, useState } from 'react';
import * as rideApi from '@/services/ride.api';
import { useSocketEvents, useSocketStatus } from './useSocket';
import { SOCKET_EVENTS } from '@/constants/socketEvents';

/**
 * Where the rider is, as the customer's screen needs it.
 *
 * Two sources, deliberately. The socket carries each position the moment it
 * arrives, which is what moves the marker. A REST read fills in the things the
 * socket does not carry — the ETA, which costs a routing lookup and so is asked
 * for on a timer rather than per fix — and is what rebuilds the whole picture
 * after a refresh or a reconnect.
 *
 * Nothing here decides anything. Whether the rider is nearby, whether they have
 * arrived, and how far away they are all come from the server; this only puts
 * them on screen. A distance computed in the browser would disagree with the
 * one the notifications were sent from, and the customer would be looking at
 * two different truths.
 */

/** How often to re-ask for the ETA. A routing call per position would be absurd. */
const ETA_INTERVAL_MS = 45_000;

export function useRideTracking(rideId, { enabled = true, stage = null } = {}) {
  const connected = useSocketStatus();

  const [position, setPosition] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [eta, setEta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loaded, setLoaded] = useState(false);

  /**
   * Whether the server has decided the rider is nearby.
   *
   * The server owns the decision; this is only how quickly the screen hears
   * about it. It is kept here rather than read from the summary alone because
   * the summary arrives on a 45-second timer: the customer would get the
   * notification and then watch a card that still said "on the way" for most of
   * a minute. The socket event is the same decision, arriving immediately.
   */
  const [nearby, setNearby] = useState(false);

  // When the last position actually landed, for the staleness clock below.
  const [lastFixAt, setLastFixAt] = useState(null);
  const inFlight = useRef(false);

  /**
   * The full picture from the server.
   *
   * Called on mount, when the socket comes back, and on the ETA timer. Failures
   * are swallowed: this is a screen that is already showing something, and an
   * error toast because a routing lookup timed out would be noise.
   */
  const refresh = useCallback(async () => {
    if (!rideId || !enabled || inFlight.current) return;
    inFlight.current = true;

    try {
      const data = await rideApi.getRiderLocation(rideId);

      setSummary(data.tracking || null);
      setEta(data.eta || null);

      // The stored latch is the authority — on a refresh or a reconnect it is
      // what tells the screen this already happened.
      if (data.tracking?.nearbyNotifiedAt) setNearby(true);

      if (data.position) {
        setPosition((current) => current || { lat: data.position.lat, lng: data.position.lng, heading: 0 });
      }
      if (data.tracking?.distanceMeters != null) setDistanceMeters(data.tracking.distanceMeters);
      if (data.tracking?.lastFixAt) setLastFixAt(new Date(data.tracking.lastFixAt).getTime());
    } catch {
      // No rider assigned yet, or the lookup failed. The screen keeps whatever
      // it already had rather than blanking.
    } finally {
      inFlight.current = false;
      setLoaded(true);
    }
  }, [rideId, enabled]);

  /**
   * On mount, when the connection returns, and when the ride moves on.
   *
   * A reconnect is the obvious moment to be out of date. So is a change of
   * stage: the leg being measured switches at the pickup, and the route and
   * ETA held here were worked out for the previous one. Without this the map
   * kept drawing the road to the pickup — looping back on itself once the
   * rider had arrived — until the next timer tick, up to forty-five seconds
   * later. A handful of extra lookups per ride, at the only moments the answer
   * is known to have changed.
   */
  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [refresh, enabled, connected, stage]);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(refresh, ETA_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh, enabled]);

  /** Each position as it arrives. This is what moves the marker. */
  const onLocation = useCallback(
    (payload) => {
      if (!payload || String(payload.rideId) !== String(rideId)) return;

      setPosition({ lat: payload.lat, lng: payload.lng, heading: payload.heading ?? 0 });
      setLastFixAt(Date.now());

      // Null when the fix was too vague for the server to measure against. The
      // last good distance is kept rather than replaced with nothing, because
      // "1.2 km" going blank for one ping reads as a fault.
      if (payload.distanceMeters != null) setDistanceMeters(payload.distanceMeters);
    },
    [rideId]
  );

  /** The server's nearby decision, as soon as it is made. */
  const onNearby = useCallback(
    (payload) => {
      if (!payload || String(payload.rideId) !== String(rideId)) return;
      setNearby(true);
      if (payload.distanceMeters != null) setDistanceMeters(payload.distanceMeters);
    },
    [rideId]
  );

  useSocketEvents(
    enabled
      ? {
          [SOCKET_EVENTS.RIDER_LOCATION]: onLocation,
          [SOCKET_EVENTS.RIDE_RIDER_NEARBY]: onNearby
        }
      : {},
    [onLocation, onNearby, enabled]
  );

  /**
   * Has the feed gone quiet?
   *
   * Recomputed on a timer rather than derived once, because nothing re-renders
   * this component while nothing is arriving — which is precisely the situation
   * being detected.
   *
   * It is "going quiet", never "offline". A phone in a lift or a tunnel has not
   * abandoned the trip, and telling a customer their rider is gone over a
   * thirty-second gap starts a support ticket that did not need to exist.
   */
  // The window comes from the server, so an operator changing it in the admin
  // console changes what this screen does — no number is kept here.
  const staleAfterMs = (summary?.staleAfterSeconds ?? 30) * 1000;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [enabled]);

  const stale = enabled && loaded ? !lastFixAt || now - lastFixAt > staleAfterMs : false;

  return {
    position,
    distanceMeters,
    eta,
    /** The server's nearby decision, from the socket or the stored latch. */
    nearby,
    /** The server's own view, including the thresholds it is using. */
    summary,
    stale,
    loaded,
    connected,
    refresh
  };
}
