import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { tileLayer, ZOOM } from './tileProvider';
import { destinationIcon, pickupIcon, selfIcon, vehicleIcon } from './markers';
import { decodePolyline, DEFAULT_CENTER, isValidLatLng } from '@/utils/geo';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Keeps the meaningful points in view — but on somebody's terms.
 *
 * Without `signal`, any point moving refits the map. That is right for a picker,
 * where the points only move when the user moves them.
 *
 * It is wrong for a live trip. A rider sends a position every few seconds, and
 * refitting on each one wrenches the map back the instant the customer pans it,
 * so they cannot look down the road to see where their rider actually is. With
 * a `signal`, the caller decides when to refit — when tracking starts, when the
 * ride changes state, and when the customer taps the centre button — and the
 * rider moving is not one of those moments.
 */
function FitBounds({ points, padding = [56, 56], enabled = true, signal, insetBottom = 0 }) {
  const map = useMap();

  // Join the coordinates so the effect only fires when a point actually moves.
  const key = points
    .filter(isValidLatLng)
    .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
    .join('|');

  /**
   * The count is in the trigger alongside the signal so a point ARRIVING still
   * fits — the rider marker appearing for the first time should bring it into
   * view — while the same point moving afterwards does not.
   */
  const validCount = points.filter(isValidLatLng).length;
  const trigger = signal === undefined ? key : `${signal}:${validCount}`;

  useEffect(() => {
    if (!enabled) return undefined;

    const valid = points.filter(isValidLatLng);
    if (!valid.length) return undefined;

    /**
     * The fit is instant, and that is deliberate.
     *
     * An animated zoom ends through a transition-end handler that asks the map
     * where its panes are. Leaving the screen before it fires — which is all
     * that switching tabs quickly does — means the panes have been torn down by
     * the time it runs, and Leaflet throws `Cannot read properties of undefined
     * (reading '_leaflet_pos')` out of `_onZoomTransitionEnd`. Neither
     * `map.stop()` nor Leaflet's own `remove()` cancels that queued handler, so
     * the only reliable fix is not to start the animation.
     *
     * What it costs: a re-fit during a ride snaps instead of gliding. What it
     * buys: the map cannot outlive its container. On a screen that re-fits
     * every time the rider moves, the snap is also the calmer of the two.
     */
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], ZOOM.street, { animate: false });
    } else {
      /**
       * The panel sits ON the map, so the fit has to avoid the covered strip.
       *
       * With symmetric padding Leaflet centres the route in the whole
       * container — and on a phone the bottom half of that container is behind
       * the sheet, so half the route is fitted into a part of the map nobody
       * can see. `insetBottom` is how much is covered.
       */
      map.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lng])), {
        paddingTopLeft: padding,
        paddingBottomRight: [padding[0], padding[1] + insetBottom],
        animate: false,
        maxZoom: ZOOM.close
      });
    }

    // Belt and braces: cancel any pan still in flight from a user gesture.
    return () => {
      try {
        if (map && map._loaded) map.stop();
      } catch {
        // Already gone. Nothing left to stop.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, enabled, map]);

  return null;
}

/**
 * The rider's marker, moved rather than redrawn.
 *
 * Positions arrive every few seconds. Setting them straight onto the marker
 * makes it jump between points like a chess piece, which reads as a broken feed
 * rather than as a vehicle. So each new fix is tweened towards over roughly the
 * interval between fixes, and the marker is always somewhere a vehicle could
 * plausibly be.
 *
 * Both the position and the heading are driven IMPERATIVELY, through the
 * Leaflet marker, rather than through props:
 *
 *   - The position prop is fixed at the first fix. If it changed on every
 *     render, react-leaflet would call `setLatLng` itself and fight the tween.
 *   - The icon is built once. Rebuilding it per heading replaces the marker's
 *     DOM element, which throws away the CSS rotation transition inside it and
 *     makes every turn a snap. Setting the transform on the existing element
 *     lets that transition actually run.
 */
function RiderMarker({ position, heading = 0 }) {
  const reduced = usePrefersReducedMotion();
  const marker = useRef(null);

  // Where the marker is right now, as opposed to where the server last said.
  const shown = useRef({ lat: position.lat, lng: position.lng });

  // Fixed on purpose — see the note above. The tween owns the position after
  // this, and react-leaflet must not touch it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => [position.lat, position.lng], []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const icon = useMemo(() => vehicleIcon(heading), []);

  useEffect(() => {
    const instance = marker.current;
    if (!instance) return undefined;

    const apply = () => {
      try {
        instance.setLatLng([shown.current.lat, shown.current.lng]);
      } catch {
        // The map went away mid-tween. Nothing to move.
      }
    };

    if (reduced) {
      shown.current = { lat: position.lat, lng: position.lng };
      apply();
      return undefined;
    }

    const tween = gsap.to(shown.current, {
      lat: position.lat,
      lng: position.lng,
      // Close to the gap between fixes, so the marker is still moving when the
      // next one lands and the motion reads as continuous.
      duration: 0.9,
      ease: 'none',
      onUpdate: apply
    });

    return () => tween.kill();
  }, [position.lat, position.lng, reduced]);

  useEffect(() => {
    const element = marker.current?.getElement?.()?.firstElementChild;
    if (element) element.style.transform = `rotate(${heading}deg)`;
  }, [heading]);

  return <Marker ref={marker} position={initial} icon={icon} title="Your rider" />;
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

/** Leaflet measures the container on mount; a sheet opening changes that. */
function Resizer({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(id);
  }, [map, trigger]);
  return null;
}

/**
 * One map component for every screen. Callers pass the points that matter and it
 * draws them; nothing above it needs to know about Leaflet.
 */
export function MapView({
  pickup,
  destination,
  self,
  rider,
  riderHeading = 0,
  polyline,
  center,
  zoom = ZOOM.street,
  fit = true,
  /**
   * Change this to refit the map. Leave it undefined and the map refits
   * whenever a point moves, which is what a picker wants and a live trip
   * emphatically does not.
   */
  fitSignal,
  /**
   * Pixels along the bottom of the map that something else is covering — a
   * sheet or a panel drawn over it. The fit keeps its content out of that
   * strip; it does not change the map's size.
   */
  insetBottom = 0,
  /**
   * Where the rider is heading, used only when no road geometry is available.
   *
   * The line drawn to it is dashed, and deliberately does not look like a
   * road: it is the direct line between two points, not a route anybody can
   * drive. Drawing it solid would be a claim about the roads that nothing here
   * has checked.
   */
  routeTo,
  onPick,
  resizeTrigger,
  className = 'h-full w-full',
  interactive = true
}) {
  const route = useMemo(() => decodePolyline(polyline), [polyline]);

  // Only when there is no real route to draw, and only between two points that
  // both exist.
  const direct =
    route.length > 1 || !isValidLatLng(rider) || !isValidLatLng(routeTo)
      ? null
      : [
          [rider.lat, rider.lng],
          [routeTo.lat, routeTo.lng]
        ];

  const focus = center || pickup || self || destination || DEFAULT_CENTER;
  const tracked = [pickup, destination, rider, route.length ? null : self].filter(Boolean);

  return (
    <MapContainer
      center={[focus.lat, focus.lng]}
      zoom={zoom}
      zoomControl={false}
      attributionControl
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      className={className}
    >
      <TileLayer url={tileLayer.url} attribution={tileLayer.attribution} maxZoom={tileLayer.maxZoom} />

      {direct && (
        <Polyline
          positions={direct}
          pathOptions={{ className: 'route-line', weight: 3, dashArray: '6 8', opacity: 0.75 }}
        />
      )}

      {route.length > 1 && (
        <>
          {/* Casing under the line keeps it legible over busy tiles. Leaflet
              writes `color` straight onto the stroke attribute, so the theme
              colours come from a class rather than a literal here. */}
          <Polyline positions={route} pathOptions={{ className: 'route-casing', weight: 8 }} />
          <Polyline positions={route} pathOptions={{ className: 'route-line', weight: 4 }} />
        </>
      )}

      {isValidLatLng(self) && <Marker position={[self.lat, self.lng]} icon={selfIcon()} interactive={false} />}

      {isValidLatLng(pickup) && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon()} title="Pickup" />
      )}

      {isValidLatLng(destination) && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon()} title="Destination" />
      )}

      {isValidLatLng(rider) && <RiderMarker position={rider} heading={riderHeading} />}

      <FitBounds
        points={route.length ? [...tracked] : tracked}
        enabled={fit}
        signal={fitSignal}
        insetBottom={insetBottom}
      />
      {onPick && <ClickHandler onPick={onPick} />}
      <Resizer trigger={resizeTrigger} />
    </MapContainer>
  );
}
