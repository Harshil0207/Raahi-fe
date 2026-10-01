import { useCallback, useEffect, useState } from 'react';
import * as placeApi from '@/services/place.api';

/** Saved places, shared by the home screen shortcuts and the manage screen. */
export function useSavedPlaces() {
  const [places, setPlaces] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setPlaces(await placeApi.listPlaces());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (payload, id) => {
      const saved = id ? await placeApi.updatePlace(id, payload) : await placeApi.createPlace(payload);
      await load();
      return saved;
    },
    [load]
  );

  const remove = useCallback(
    async (id) => {
      await placeApi.deletePlace(id);
      await load();
    },
    [load]
  );

  return {
    places,
    loaded,
    error,
    reload: load,
    save,
    remove,
    home: places.find((p) => p.label === 'home') || null,
    work: places.find((p) => p.label === 'work') || null
  };
}
