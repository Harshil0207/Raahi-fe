import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Briefcase, Clock, House, LocateFixed, MapPin, Package, Plus, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { MapShell, MapButton } from '@/components/map/MapShell';
import { PlacePicker } from '@/components/customer/PlacePicker';
import { FareSummary } from '@/components/ride/FareSummary';
import { ServicePicker } from '@/components/customer/ServicePicker';
import { ParcelDetails, ParcelSummary } from '@/components/customer/ParcelDetails';
import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass';
import { Skeleton } from '@/components/ui/misc';
import { Logo } from '@/components/common/Logo';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useActiveCustomerRide } from '@/hooks/useRide';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useRecentDestinations } from '@/hooks/useRecentDestinations';
import { useRecentPlaces } from '@/hooks/useRecentPlaces';
import * as mapsApi from '@/services/maps.api';
import * as rideApi from '@/services/ride.api';
import * as locationApi from '@/services/location.api';
import { shortAddress } from '@/utils/format';
import { isValidLatLng } from '@/utils/geo';
import { cn } from '@/lib/utils';
import { useSetting } from '@/hooks/useUserSettings';

export default function CustomerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ride: activeRide, loading: checkingActive } = useActiveCustomerRide();
  const { position, status, error: geoError, request, isDenied } = useGeolocation({
    resumeIfAllowed: true
  });
  const { home, work, loaded: placesLoaded } = useSavedPlaces();
  const recents = useRecentDestinations(3);

  // What they picked last, kept in this browser. The server list above is trips
  // actually taken; this one is choices made, which is what the picker offers.
  const recentDestinations = useRecentPlaces('destination', { userId: user?.id });
  const recentPickups = useRecentPlaces('pickup', { userId: user?.id });

  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [picking, setPicking] = useState(null);
  const [quote, setQuote] = useState(null);
  const [serviceType, setServiceType] = useState(null);
  const [parcel, setParcel] = useState(null);
  const [parcelSheet, setParcelSheet] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);

  /*
   * Location is resumed, not demanded.
   *
   * This used to call `request()` on mount, which raised the browser's
   * permission prompt the instant Home opened — for somebody who had just been
   * asked on the location onboarding screen, and again on every visit after a
   * dismissal. `resumeIfAllowed` fetches a fix silently when permission is
   * already granted, which is the returning customer, and otherwise leaves it
   * to the "enable location" control below. Nothing about the map, the pickup
   * default or the saved places changes once a position arrives.
   */

  // A returning customer on a new browser has no local history but plenty of
  // trips. Seeding only ever fills an empty store, so it cannot disturb a list
  // they have been building by using the app.
  const seedDestinations = recentDestinations.seed;
  useEffect(() => {
    seedDestinations(recents);
  }, [recents, seedDestinations]);

  // Device position becomes the default pickup, and is stored so the backend
  // can offer it as a starting point on another device.
  useEffect(() => {
    if (!position || pickup) return;

    locationApi.saveLocation({ lat: position.lat, lng: position.lng, accuracy: position.accuracy }).catch(() => {});

    mapsApi
      .reverseGeocode(position)
      .then((place) => setPickup({ address: place.address, placeId: place.placeId, lat: position.lat, lng: position.lng }))
      .catch(() =>
        setPickup({
          address: `Current location (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`,
          lat: position.lat,
          lng: position.lng
        })
      );
  }, [position, pickup]);

  /**
   * Setting an end, and remembering that it was chosen.
   *
   * Only deliberate picks are recorded. The pickup filled in from the device's
   * position above is where they happen to be standing, not somewhere they
   * chose, and recording it would fill the list with the same corner over and
   * over.
   */
  const chooseDestination = (place) => {
    setDestination(place);
    recentDestinations.remember(place);
  };

  const choosePickup = (place) => {
    setPickup(place);
    recentPickups.remember(place);
  };

  // The fare and distance are the server's, fetched fresh whenever either end moves.
  const bothEnds = isValidLatLng(pickup) && isValidLatLng(destination);

  useEffect(() => {
    if (!bothEnds) return;

    let cancelled = false;
    setQuoting(true);

    mapsApi
      .getDirections(pickup, destination)
      .then((data) => !cancelled && setQuote(data))
      .catch((err) => {
        if (!cancelled) {
          setQuote(null);
          toast.error(err.message);
        }
      })
      .finally(() => !cancelled && setQuoting(false));

    return () => {
      cancelled = true;
    };
  }, [pickup, destination, bothEnds]);

  // A stale quote must not survive a change of endpoints.
  const activeQuote = bothEnds ? quote : null;

  // Every bookable service, priced by the server for this exact distance.
  // Memoised because the fallback would be a new array on every render, and
  // the effect below depends on it.
  const services = useMemo(() => activeQuote?.services || [], [activeQuote]);
  const service = services.find((s) => s.serviceType === serviceType) || null;
  const isParcel = service?.bookingType === 'PARCEL';

  /**
   * The first quote picks a default so the card is never in a state where the
   * fare is known but nothing is selected.
   *
   * The customer's own choice comes first, when they have one and it is still
   * on offer. A preferred vehicle the platform has since turned off falls back
   * to the first available rather than selecting nothing — a preference should
   * not be able to leave the booking card empty.
   */
  const preferredVehicle = useSetting('ride.defaultVehicle', 'none');

  useEffect(() => {
    if (!services.length) return;
    if (services.some((s) => s.serviceType === serviceType)) return;

    const preferred = services.find((s) => s.serviceType === preferredVehicle);
    setServiceType((preferred || services[0]).serviceType);
  }, [services, serviceType, preferredVehicle]);

  // Switching away from a delivery drops the package details rather than
  // quietly sending them with a passenger ride.
  useEffect(() => {
    if (!isParcel && parcel) setParcel(null);
  }, [isParcel, parcel]);

  const needsParcelDetails = isParcel && !parcel;
  const ready = Boolean(activeQuote) && Boolean(service) && !quoting && !needsParcelDetails;

  const handleBook = useCallback(async () => {
    if (!ready || booking) return;

    setBooking(true);
    try {
      const result = await rideApi.createRide({
        pickup: { address: pickup.address, placeId: pickup.placeId, lat: pickup.lat, lng: pickup.lng },
        destination: {
          address: destination.address,
          placeId: destination.placeId,
          lat: destination.lat,
          lng: destination.lng
        },
        // Only the service is sent. The rate, the distance and the fare are all
        // worked out again by the server.
        serviceType,
        ...(isParcel ? { parcel } : {})
      });

      if (result.ridersNotified === 0) {
        toast.warning('No riders nearby yet — we will keep looking.');
      }

      navigate(`/ride/${result.ride._id}`, { state: { otp: result.otp } });
    } catch (err) {
      toast.error(err.message);
      setBooking(false);
    }
  }, [ready, booking, pickup, destination, serviceType, isParcel, parcel, navigate]);

  if (checkingActive) return <FullPageLoader label="Checking for an active ride" />;

  // The backend refuses a second ride while one is running, so resume it instead.
  if (activeRide) return <Navigate to={`/ride/${activeRide._id}`} replace />;

  // Shortcuts only make sense before a destination is picked, and only when the
  // account actually has saved places or past trips to offer.
  const shortcuts = [
    home && { key: 'home', icon: House, title: home.name, place: home },
    work && { key: 'work', icon: Briefcase, title: work.name, place: work },
    ...recents.map((r, i) => ({
      key: `recent-${i}`,
      icon: Clock,
      title: shortAddress(r.address, 1),
      place: r
    }))
  ].filter(Boolean);

  const showShortcuts = !destination && placesLoaded;

  return (
    <div className="relative flex h-dvh flex-col md:h-full md:min-h-dvh">
      <div className="absolute inset-0">
        <MapShell
          className="h-full w-full"
          self={position}
          pickup={pickup}
          destination={destination}
          polyline={activeQuote?.route?.polyline}
          resizeTrigger={`${pickup?.lat}-${destination?.lat}`}
        />
      </div>

      <header className="pointer-events-none relative z-10 flex items-start justify-between gap-3 px-4 pt-safe">
        {/**
         * The screen's heading, for screen readers and for document structure.
         *
         * This is a map-first screen: the visible header is a logo and a
         * greeting, and there is nowhere to put a title without redesigning it.
         * A page with no `h1` still leaves anyone navigating by heading with
         * nothing to land on, so the heading exists and is simply not drawn.
         */}
        <h1 className="sr-only">Book a ride</h1>

        <GlassSurface
          cornerRadius={20}
          blurAmount={18}
          displacementScale={6}
          mode="polar"
          className="pointer-events-auto px-3.5 py-2.5"
        >
          <Logo compact className="md:hidden" />
          <div className="hidden md:block">
            <p className="text-xs text-muted">Hello, {user?.name?.split(' ')[0]}</p>
            <p className="text-sm font-semibold text-body">Where are you going?</p>
          </div>
        </GlassSurface>

        <MapButton
          icon={LocateFixed}
          label="Use my current location"
          onClick={request}
          className="pointer-events-auto"
          disabled={status === 'prompting'}
        />
      </header>

      {/* The tab bar floats over this screen, so the booking card has to clear it
          — otherwise the nav swallows taps meant for the request button. */}
      {/* Pinned to the bottom, but able to scroll on its own once the service
          list makes it taller than the screen — otherwise the last card and the
          button end up behind the tab bar. */}
      <div className="relative z-10 mt-auto max-h-full overflow-y-auto overscroll-contain px-3 pb-safe-nav md:mx-auto md:w-full md:max-w-md md:pb-3">
        <AnimatePresence>
          {isDenied && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-2 flex items-start gap-2.5 rounded-2xl border border-[var(--warning-edge)] bg-[var(--warning-wash)] p-3 text-xs text-body"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden />
              <p>{geoError || 'Location is blocked. Set your pickup point on the map instead.'}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showShortcuts && (
            <motion.div
              key="shortcuts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {shortcuts.map((s) => (
                <Shortcut key={s.key} icon={s.icon} title={s.title} onClick={() => chooseDestination(s.place)} />
              ))}
              {(!home || !work) && (
                <Shortcut
                  as={Link}
                  to="/saved-places"
                  icon={Plus}
                  title={home ? 'Add work' : 'Add home'}
                  muted
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout transition={{ type: 'spring', stiffness: 400, damping: 36 }}>
          <GlassSurface
            cornerRadius={26}
            blurAmount={24}
            saturation={165}
            displacementScale={12}
            mode="polar"
            className="overflow-hidden p-4 shadow-[var(--shadow-sheet)]"
          >
            <div className="space-y-2">
              <PlaceField
                tone="accent"
                label="Pickup"
                value={pickup?.address}
                placeholder={status === 'prompting' ? 'Finding your location…' : 'Choose a pickup point'}
                onClick={() => setPicking('pickup')}
              />
              <PlaceField
                tone="ink"
                label="Destination"
                value={destination?.address}
                placeholder="Where to?"
                onClick={() => setPicking('destination')}
              />
            </div>

            <AnimatePresence mode="wait">
              {quoting && (
                <motion.div
                  key="quoting"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2 border-t border-hair pt-4"
                >
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-4 w-24" />
                </motion.div>
              )}

              {activeQuote && !quoting && (
                <motion.div
                  key="quote"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 border-t border-hair pt-4"
                >
                  <ServicePicker
                    services={services}
                    value={serviceType}
                    onChange={setServiceType}
                    currency={activeQuote.fare.currency}
                  />

                  {isParcel &&
                    (parcel ? (
                      <ParcelSummary parcel={parcel} onEdit={() => setParcelSheet(true)} />
                    ) : (
                      <Button variant="outline" block className="mt-2" onClick={() => setParcelSheet(true)}>
                        <Package aria-hidden />
                        Add package details
                      </Button>
                    ))}

                  {service && (
                    <FareSummary
                      className="mt-4"
                      fare={service.estimatedFare}
                      currency={activeQuote.fare.currency}
                      distanceKm={activeQuote.route.distanceKm}
                      durationMin={activeQuote.route.durationMin}
                      label={`${service.label} — estimated fare`}
                    />
                  )}

                  {activeQuote.route.source === 'haversine' && (
                    <p className="mt-2 text-xs text-muted">
                      Straight-line estimate — the routing service was unreachable.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Button size="lg" block className="mt-4" disabled={!ready} loading={booking} onClick={handleBook}>
              {booking
                ? 'Requesting'
                : ready
                  ? isParcel
                    ? 'Request delivery'
                    : 'Request ride'
                  : needsParcelDetails
                    ? 'Add package details to continue'
                    : 'Set pickup and destination'}
              {ready && !booking && <ArrowRight aria-hidden />}
            </Button>
          </GlassSurface>
        </motion.div>
      </div>

      {parcelSheet && (
        <ParcelDetails
          open
          onOpenChange={setParcelSheet}
          serviceLabel={service?.label || 'Parcel'}
          initial={parcel}
          sender={user}
          onSave={setParcel}
        />
      )}

      {picking && (
        <PlacePicker
          key={picking}
          onOpenChange={(open) => !open && setPicking(null)}
          title={picking === 'destination' ? 'Where to?' : 'Pickup point'}
          near={position || pickup}
          onSelect={(place) => (picking === 'destination' ? chooseDestination(place) : choosePickup(place))}
          recents={picking === 'destination' ? recentDestinations.recents : recentPickups.recents}
          recentsTitle={picking === 'destination' ? 'Recent destinations' : 'Recent pickups'}
          recentsEmptyTitle={picking === 'destination' ? 'No recent destinations' : 'No recent pickups'}
          recentsEmptyHint={
            picking === 'destination'
              ? 'Search for a place, or drop a pin on the map.'
              : 'Use Near me, search, or drop a pin on the map.'
          }
        />
      )}
    </div>
  );
}

/** One-tap destination: a saved place or somewhere the customer has been before. */
function Shortcut({ as: Tag = 'button', icon: Icon, title, onClick, muted = false, ...props }) {
  return (
    <Tag
      {...(Tag === 'button' ? { type: 'button', onClick } : props)}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-full border border-hair bg-[color-mix(in_oklab,var(--surface-elevated)_90%,transparent)] py-2 pl-3 pr-3.5',
        'text-[13px] shadow-[var(--shadow-raise)] backdrop-blur transition-transform active:scale-[0.97]',
        muted ? 'text-muted' : 'text-body'
      )}
    >
      <Icon className={cn('size-4 shrink-0', muted ? 'text-faint' : 'text-accent')} aria-hidden />
      <span className="max-w-[140px] truncate">{title}</span>
    </Tag>
  );
}

function PlaceField({ label, value, placeholder, onClick, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-[color-mix(in_oklab,var(--surface-sunken)_80%,transparent)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)]"
    >
      <span
        className={cn(
          'size-2.5 shrink-0',
          tone === 'accent' ? 'rounded-full bg-[var(--accent)]' : 'rounded-[3px] bg-[var(--text)]'
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className={cn('block truncate text-[15px]', value ? 'text-body' : 'text-muted')}>
          {value ? shortAddress(value, 3) : placeholder}
        </span>
      </span>
      <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
