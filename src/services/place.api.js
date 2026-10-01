import { api, unwrap } from './api';

export const listPlaces = () => api.get('/places').then(unwrap).then((d) => d.places);

// { label: 'home' | 'work' | 'custom', name, address, placeId?, lat, lng }
export const createPlace = (payload) => api.post('/places', payload).then(unwrap);

export const updatePlace = (placeId, payload) => api.patch(`/places/${placeId}`, payload).then(unwrap);

export const deletePlace = (placeId) => api.delete(`/places/${placeId}`).then(unwrap);
