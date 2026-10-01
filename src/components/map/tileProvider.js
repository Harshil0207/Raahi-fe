/**
 * The only place that knows which tiles are being drawn. The backend decides the
 * geocoding/routing provider; this decides the raster underneath. Swapping to a
 * different tile host — or to a commercial provider — is a change to this file
 * and the two env vars it reads, nothing else.
 */
export const tileLayer = {
  url: import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
};

export const ZOOM = {
  city: 12,
  street: 15,
  close: 17
};
