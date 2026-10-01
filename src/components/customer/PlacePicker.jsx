import { useEffect, useRef, useState } from 'react';
import { Crosshair, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheet, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton, EmptyState } from '@/components/ui/misc';
import { MapShell } from '@/components/map/MapShell';
import { RecentPlaces } from '@/components/customer/RecentPlaces';
import * as mapsApi from '@/services/maps.api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DEFAULT_CENTER, isValidLatLng } from '@/utils/geo';
import { shortAddress } from '@/utils/format';

/**
 * Picks a place three ways: search, current position, or dropping a pin.
 *
 * The pin is not a fallback for search being pretty — it is the path that still
 * works when the geocoding provider is down, so booking never depends on a
 * third-party service being reachable.
 *
 * Mounted only while open (the caller keys it), so each opening starts clean.
 *
 * With nothing typed it shows what was picked before rather than an instruction
 * about typing three characters — on most openings the place wanted is already
 * in that list, and reading it costs nothing.
 */
export function PlacePicker({
  onOpenChange,
  title,
  initialQuery = '',
  near,
  onSelect,
  recents = [],
  recentsTitle,
  recentsEmptyTitle,
  recentsEmptyHint
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [mode, setMode] = useState('search');
  const [pin, setPin] = useState(null);
  const [resolving, setResolving] = useState(false);

  const debounced = useDebouncedValue(query.trim(), 400);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(id);
  }, []);

  const canSearch = mode === 'search' && debounced.length >= 3;

  useEffect(() => {
    if (!canSearch) return;

    // Out-of-order responses would otherwise overwrite newer results.
    const requestId = ++requestIdRef.current;
    setSearching(true);
    setSearchError(null);

    mapsApi
      .searchPlaces(debounced, near)
      .then((found) => {
        if (requestId === requestIdRef.current) setResults(found);
      })
      .catch((err) => {
        if (requestId === requestIdRef.current) {
          setResults([]);
          setSearchError(err.message);
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setSearching(false);
      });
  }, [debounced, canSearch, near]);

  async function choose(result) {
    // OSM search already carries coordinates; Google autocomplete needs a lookup.
    if (Number.isFinite(result.lat) && Number.isFinite(result.lng)) {
      onSelect({
        address: result.description,
        placeId: result.placeId,
        lat: result.lat,
        lng: result.lng
      });
      onOpenChange(false);
      return;
    }

    setResolving(true);
    try {
      const place = await mapsApi.geocode({ placeId: result.placeId });
      onSelect({ address: place.address, placeId: place.placeId, lat: place.lat, lng: place.lng });
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResolving(false);
    }
  }

  async function confirmPin() {
    if (!isValidLatLng(pin)) return;

    setResolving(true);
    try {
      // A readable address is nice to have; the coordinates are what matter.
      const place = await mapsApi.reverseGeocode(pin);
      onSelect({ address: place.address, placeId: place.placeId, lat: pin.lat, lng: pin.lng });
    } catch {
      onSelect({
        address: `Pinned location (${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)})`,
        lat: pin.lat,
        lng: pin.lng
      });
    } finally {
      setResolving(false);
      onOpenChange(false);
    }
  }

  const visibleResults = canSearch ? results : [];

  return (
    <BottomSheet open onOpenChange={onOpenChange} label={title} className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-2 pb-3">
        <SheetTitle className="flex-1 text-base font-semibold text-body">{title}</SheetTitle>
        <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close">
          <X aria-hidden />
        </Button>
      </div>

      {mode === 'search' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a place or address"
                className="pl-11"
                aria-label={title}
              />
            </div>

            <div className="mt-3 flex gap-2">
              {near && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPin(near);
                    setMode('pin');
                  }}
                >
                  <LocateFixed aria-hidden />
                  Near me
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { setPin(near || DEFAULT_CENTER); setMode('pin'); }}>
                <MapPin aria-hidden />
                Set on map
              </Button>
            </div>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-safe">
            {searching && (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {!searching && searchError && (
              <EmptyState
                icon={Search}
                title="Search isn't available"
                description={searchError}
                action={
                  <Button variant="outline" onClick={() => { setPin(near || DEFAULT_CENTER); setMode('pin'); }}>
                    <MapPin aria-hidden />
                    Set the point on the map instead
                  </Button>
                }
              />
            )}

            {!searching && !searchError && debounced.length >= 3 && !visibleResults.length && (
              <EmptyState icon={Search} title="Nothing found" description={`No places match "${debounced}".`} />
            )}

            {!searching && !searchError && debounced.length < 3 && (
              <RecentPlaces
                places={recents}
                disabled={resolving}
                title={recentsTitle}
                emptyTitle={recentsEmptyTitle}
                emptyHint={recentsEmptyHint}
                onSelect={(place) => {
                  // Already a resolved place with coordinates, so it skips the
                  // geocoding round trip a search result needs.
                  onSelect({
                    address: place.address,
                    placeId: place.placeId,
                    lat: place.lat,
                    lng: place.lng
                  });
                  onOpenChange(false);
                }}
              />
            )}

            {!searching &&
              visibleResults.map((result) => (
                <button
                  key={result.placeId || result.description}
                  type="button"
                  onClick={() => choose(result)}
                  disabled={resolving}
                  className="flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-60"
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-muted">
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-body">
                      {result.mainText || shortAddress(result.description)}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {result.secondaryText || result.description}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative h-[42vh] min-h-64 md:h-80">
            <MapShell
              className="h-full w-full"
              center={pin || near || DEFAULT_CENTER}
              pickup={pin}
              fit={false}
              onPick={setPin}
              resizeTrigger={mode}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <span className="rounded-full bg-elevated px-3 py-1.5 text-xs text-muted shadow-[var(--shadow-float)]">
                Tap the map to place the point
              </span>
            </div>
          </div>

          <div className="space-y-3 p-4 pb-safe">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Crosshair className="size-4 shrink-0" aria-hidden />
              <span className="tabular truncate">
                {isValidLatLng(pin) ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'No point selected'}
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" block onClick={() => setMode('search')}>
                Back to search
              </Button>
              <Button block disabled={!isValidLatLng(pin)} loading={resolving} onClick={confirmPin}>
                Use this point
              </Button>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
