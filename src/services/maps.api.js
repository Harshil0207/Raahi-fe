import { api, unwrap } from './api';

/**
 * All map lookups go through the backend, which owns the provider choice and the
 * API key. The frontend never talks to a map provider directly.
 */

// Results may already carry lat/lng (OSM does, Google autocomplete does not).
export const searchPlaces = (q, near) =>
  api
    .get('/maps/search', { params: { q, lat: near?.lat, lng: near?.lng } })
    .then(unwrap)
    .then((data) => data.results);

export const geocode = (params) => api.get('/maps/geocode', { params }).then(unwrap);

export const reverseGeocode = ({ lat, lng }) => geocode({ lat, lng });

// Returns { route: { distanceKm, durationMin, polyline, source }, fare }.
export const getDirections = (origin, destination) =>
  api
    .get('/maps/directions', {
      params: {
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: destination.lat,
        destLng: destination.lng
      }
    })
    .then(unwrap);
