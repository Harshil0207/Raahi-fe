/**
 * Decodes an encoded polyline (precision 5) into [lat, lng] pairs. Both Google
 * Directions and OSRM return this format, so one decoder covers either backend
 * provider.
 */
export function decodePolyline(encoded) {
  if (!encoded) return [];

  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Backend places are GeoJSON: coordinates are [lng, lat], not [lat, lng].
export const pointToLatLng = (point) =>
  point?.coordinates ? { lat: point.coordinates[1], lng: point.coordinates[0] } : null;

export const isValidLatLng = (p) =>
  Boolean(p) &&
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lng) &&
  p.lat >= -90 &&
  p.lat <= 90 &&
  p.lng >= -180 &&
  p.lng <= 180;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

// Only used to decide whether a position moved enough to be worth sending.
export function distanceKm(a, b) {
  if (!isValidLatLng(a) || !isValidLatLng(b)) return Infinity;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function boundsOf(positions) {
  const valid = positions.filter(isValidLatLng);
  if (!valid.length) return null;
  return valid.map((p) => [p.lat, p.lng]);
}

// Fallback view when nothing is known yet.
export const DEFAULT_CENTER = { lat: 19.076, lng: 72.8777 };
