import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleSlash, Home, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MapShell } from '@/components/map/MapShell';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { StatusBadge, Skeleton } from '@/components/ui/misc';
import { RoutePreview } from '@/components/ride/RoutePreview';
import { FareSummary } from '@/components/ride/FareSummary';
import { FareBreakdown } from '@/components/ride/FareBreakdown';
import { RateTrip } from '@/components/ride/RateTrip';
import { TripProgress } from '@/components/ride/TripProgress';
import { OtpDisplay } from '@/components/ride/OtpDisplay';
import { PersonCard } from '@/components/ride/PersonCard';
import { RiderApproach } from '@/components/ride/RiderApproach';
import { WaitingMeter } from '@/components/ride/WaitingMeter';
import { ChatButton } from '@/components/chat/ChatButton';
import { ChatSheet } from '@/components/chat/ChatSheet';
import { useChatUnread } from '@/hooks/useChat';
import { FindingRider } from '@/components/customer/FindingRider';
import { RequestExpired } from '@/components/customer/RequestExpired';
import { PaymentPanel } from '@/components/customer/PaymentPanel';
import { useRide } from '@/hooks/useRide';
import { useRideTracking } from '@/hooks/useRideTracking';
import { useSocketEvents } from '@/hooks/useSocket';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import * as rideApi from '@/services/ride.api';
import { SOCKET_EVENTS } from '@/constants/socketEvents';
import { RIDE_STATUS, STATUS_LABEL, STATUS_TONE,
  isFinished
} from '@/constants/ride';
import { pointToLatLng } from '@/utils/geo';
import { formatMoney } from '@/utils/format';
import { CancelSheet } from '@/components/ride/CancelSheet';
import { useSetting } from '@/hooks/useUserSettings';

export default function RideTracking() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { ride, loading, error, refetch, patch } = useRide(rideId);

  // The code handed over at booking; refetched from the server after a reload.
  const [otp, setOtp] = useState(location.state?.otp ?? null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Counted across conversations; on this screen there is only ever one.
  const { unread: chatUnread, refresh: refreshChatUnread } = useChatUnread();
  const [cancelling, setCancelling] = useState(false);

  const status = ride?.status;

  /**
   * The pickup code appears when the handover does, and not before.
   *
   * This used to be true from ACCEPTED onwards, so the code was on screen —
   * under "share this with your rider" — while the rider was still a
   * kilometre away and driving. Two things were wrong with that. It invites
   * the customer to read the code out to whoever turns up first, which is the
   * one thing the code exists to prevent; and it filled the panel with the
   * part of the ride that had not happened yet instead of the part that had.
   *
   * ARRIVED is the server's word for "the rider is at the pickup", set either
   * by the rider or by the proximity check — never by this screen. Everything
   * below reads the status; nothing infers the step from "a rider accepted".
   */
  const showOtp = status === RIDE_STATUS.ARRIVED;

  useEffect(() => {
    if (otp || !showOtp) return;

    let cancelled = false;
    setOtpLoading(true);

    rideApi
      .getRideOtp(rideId)
      .then((data) => !cancelled && setOtp(data.otp))
      .catch(() => {})
      .finally(() => !cancelled && setOtpLoading(false));

    return () => {
      cancelled = true;
    };
  }, [rideId, otp, showOtp]);

  useSocketEvents(
    {
      /**
       * Accepted and arrived are NOT announced here any more.
       *
       * Their toast and their sound come from `useRideNotifications`, which is
       * mounted once above every customer screen. Announcing them here as well
       * gave a customer on this page two toasts for one event, and gave a
       * customer anywhere else none at all.
       *
       * What stays is the part that is about THIS screen: re-reading the ride
       * when the server moves it on.
       */
      // Sent once per trip; the latch is on the ride document, server-side, so
      // a rider circling for parking cannot make this fire five times.
      [SOCKET_EVENTS.RIDE_RIDER_NEARBY]: () => toast.info('Your rider is nearby'),
      [SOCKET_EVENTS.RIDE_ARRIVED]: () => {
        // The status moved on the server — by proximity or by the rider's own
        // button — so the screen has to re-read it rather than assume.
        refetch();
      },
      [SOCKET_EVENTS.RIDE_COMPLETED]: () => toast.success('Trip complete'),
      // The trip has ended and the fare is fixed; the money has not landed yet.
      [SOCKET_EVENTS.RIDE_AWAITING_PAYMENT]: () => refetch(),
      // The round is over. The sheet below is what the customer acts on; the
      // toast is only there for someone looking at another part of the screen.
      [SOCKET_EVENTS.RIDE_NO_RIDERS]: (p) => {
        setRoundEnded(true);
        toast.warning(p?.message || 'No rider accepted in time.');
      },
      [SOCKET_EVENTS.RIDE_CANCELLED]: (p) =>
        p?.cancelledBy === 'rider' && toast.warning('Your rider cancelled. Book again to find another.')
    },
    [refetch]
  );

  /**
   * Live tracking. Enabled only while there is something to track — before a
   * rider accepts there is no position, and after the trip ends the feed has
   * stopped, so subscribing either side of that is work for nothing.
   */
  const trackable =
    status &&
    [
      RIDE_STATUS.ACCEPTED,
      RIDE_STATUS.ARRIVING,
      RIDE_STATUS.ARRIVED,
      RIDE_STATUS.OTP_VERIFIED,
      RIDE_STATUS.IN_PROGRESS
    ].includes(status);

  const tracking = useRideTracking(rideId, { enabled: Boolean(trackable), stage: status });

  /**
   * How much of the map the panel is covering.
   *
   * Measured rather than assumed: the panel's height depends on the stage of
   * the ride, and it is capped at a fraction of the viewport, so there is no
   * constant to use. The map fits its route above this strip — see
   * `insetBottom` on MapView. Above `md` the panel is a column beside the map
   * and covers nothing, so the inset is zero there.
   */
  const isDesktop = useIsDesktop();
  const [panelHeight, setPanelHeight] = useState(0);
  const panelObserver = useRef(null);

  /**
   * A CALLBACK ref, not a `useRef` read inside an effect.
   *
   * This screen returns a skeleton while the ride loads, so on the first
   * render the panel does not exist yet. An effect that read `panelRef.current`
   * on mount therefore found null, set the height to zero, and — with nothing
   * in its dependency list that changes when the panel finally appears — never
   * ran again. The map spent the whole ride fitting to a strip it believed
   * nothing was covering. A callback ref runs when the node actually attaches,
   * which is the point this needs to know about.
   *
   * What is measured is the covered strip, from the top of the panel to the
   * bottom of the window — not the panel's own height, which leaves out the
   * gap beneath it.
   */
  const panelRef = useCallback((node) => {
    panelObserver.current?.disconnect();
    panelObserver.current = null;

    if (!node) {
      setPanelHeight(0);
      return;
    }

    const measure = () => setPanelHeight(Math.round(window.innerHeight - node.getBoundingClientRect().top));

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    panelObserver.current = observer;
    measure();
  }, []);

  useEffect(() => () => panelObserver.current?.disconnect(), []);
  const riderPosition = tracking.position;

  /**
   * When the map is allowed to refit itself.
   *
   * Changing this string refits; the rider moving does not. So the view is
   * squared up when tracking starts, when the ride changes state, and when the
   * customer taps centre — and stays where they left it in between, which is
   * the only way panning ahead to look at the road is possible at all.
   */
  const [centreNonce, setCentreNonce] = useState(0);

  /**
   * The last term is the covered strip, in rough bands rather than pixels.
   *
   * The map has to refit when the panel changes size, because the panel is
   * drawn over it: at arrival the pickup code appears, the panel grows by
   * about a hundred pixels, and whatever had just been fitted into the space
   * above it ends up underneath. But the height must not enter this signal
   * exactly — it changes by a pixel or two on its own, and each change would
   * refit the map and drag it out from under a customer who had panned it.
   *
   * Banding gives both: a real change of panel size crosses a band and refits
   * once, and nothing else does. The rider moving never touches this.
   */
  const coveredBand = Math.round(panelHeight / 100);

  /**
   * Whether a change of ride state is allowed to move the map.
   *
   * With "follow the map automatically" off, only two things refit: the
   * customer tapping centre, and the panel changing size. The second is not
   * following — it is the panel being drawn over the map, so whatever was
   * fitted above it would otherwise end up underneath and unreadable. Leaving
   * that out would make the setting break the screen rather than change it.
   */
  const follow = useSetting('ride.autoCentreMap', true);
  // The fare itself is always shown; this only governs the expansion into
  // distance, waiting and charges.
  const showBreakdown = useSetting('ride.showFareBreakdown', true);
  const fitSignal = follow ? `${status}:${centreNonce}:${coveredBand}` : `${centreNonce}:${coveredBand}`;

  const pickup = useMemo(() => pointToLatLng(ride?.pickup?.location), [ride]);
  const destination = useMemo(() => pointToLatLng(ride?.destination?.location), [ride]);

  /**
   * Which leg the map is about.
   *
   * While the rider is coming to collect, the map is about that approach and
   * nothing else. Keeping the drop-off on it forced the view to hold both ends
   * of the whole journey — several kilometres apart — which zoomed out far
   * enough that the rider and the pickup sat on top of each other and the
   * approach could not be read at all. The drop-off is still on screen as an
   * address in the panel; it returns to the map once the trip starts and it is
   * where the rider is actually going.
   *
   * Null before a rider accepts and after the trip ends: there is no leg in
   * progress, so the map shows the journey as a whole.
   */
  const mapLeg = useMemo(() => {
    if ([RIDE_STATUS.ACCEPTED, RIDE_STATUS.ARRIVING, RIDE_STATUS.ARRIVED].includes(status)) return 'pickup';
    if ([RIDE_STATUS.OTP_VERIFIED, RIDE_STATUS.IN_PROGRESS].includes(status)) return 'destination';
    return null;
  }, [status]);

  const legTarget = mapLeg === 'pickup' ? pickup : mapLeg === 'destination' ? destination : null;

  // Before pickup the rider's own position matters; after it, the route does.
  const riderMarker =
    riderPosition || (ride?.rider?.currentLocation ? pointToLatLng(ride.rider.currentLocation) : null);

  /**
   * Whether riders are still being asked.
   *
   * Two sources, because either one alone leaves a gap. `searchExpiresAt` comes
   * from the server and is right on a fresh load or a reconnect; the socket
   * event is what makes the screen change the moment the round ends rather than
   * on the next poll. Both are needed: a customer who opens the app after the
   * round expired gets the first, and one watching the screen gets the second.
   */
  const [roundEnded, setRoundEnded] = useState(false);

  const deadline = ride?.searchExpiresAt ? new Date(ride.searchExpiresAt).getTime() : null;

  // No open deadline while searching means nobody is being asked right now.
  const searchOver = status === RIDE_STATUS.SEARCHING && (roundEnded || deadline === null);

  /**
   * One effect owns the deadline: it decides immediately if the round has
   * already passed, and otherwise sets a timer for the moment it does. The
   * comparison lives here rather than in the render because reading the clock
   * while rendering makes the result depend on when React happened to run.
   */
  useEffect(() => {
    if (deadline === null) return undefined;

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      setRoundEnded(true);
      return undefined;
    }

    // A fresh round is under way, whatever the previous one did.
    setRoundEnded(false);
    const id = setTimeout(() => setRoundEnded(true), remaining + 400);
    return () => clearTimeout(id);
  }, [deadline]);

  async function handleCancel(reason) {
    setCancelling(true);
    try {
      const cancelled = await rideApi.cancelRide(rideId, reason);
      // What was actually charged, from the server — not the figure the sheet
      // warned about, which is only what the rules would charge.
      const fee = cancelled?.cancellation?.fee || 0;
      toast.success(fee > 0 ? `Ride cancelled. A ${fee.toFixed(2)} cancellation fee applies.` : 'Ride cancelled');
      setConfirmCancel(false);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setCancelling(false);
    }
  }

  if (loading) return <TrackingSkeleton />;
  if (error?.status === 404 || error?.status === 403) return <Navigate to="/" replace />;
  if (!ride) return <Navigate to="/" replace />;

  const finished = isFinished(status) || status === RIDE_STATUS.CANCELLED;

  // The chat is created when a rider accepts, so there is nobody to talk to
  // before that and no button until there is.
  const hasChat = Boolean(ride.rider) && status !== RIDE_STATUS.SEARCHING;
  const canCancel = !finished && status !== RIDE_STATUS.IN_PROGRESS && status !== RIDE_STATUS.OTP_VERIFIED;

  return (
    <div className="relative flex h-dvh flex-col md:flex-row">
      <div className="absolute inset-0 md:relative md:flex-1">
        <MapShell
          className="h-full w-full"
          pickup={mapLeg === 'destination' ? null : pickup}
          destination={mapLeg === 'pickup' ? null : destination}
          rider={riderMarker}
          riderHeading={riderPosition?.heading ?? 0}
          /**
           * The road to the current leg, when the routing provider gave one.
           * With no provider reachable this is null and the map draws a dashed
           * direct line instead, which does not pretend to be a road.
           */
          polyline={tracking.eta?.polyline || null}
          routeTo={legTarget}
          fitSignal={fitSignal}
          insetBottom={isDesktop ? 0 : panelHeight}
          resizeTrigger={status}
        />
      </div>

      <AppBar
        floating
        className="md:hidden"
        back="/"
        right={<StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>}
      />

      <div className="relative z-10 mt-auto w-full px-3 pb-3 md:mt-0 md:w-[26rem] md:shrink-0 md:overflow-y-auto md:p-4">
        <motion.div
          ref={panelRef}
          layout
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          /**
           * The panel is capped on phones so the map keeps a usable share.
           *
           * It grows with the ride — rider, code, addresses, fare, and now the
           * approach card — and at 360px it had taken 80% of the screen,
           * leaving 158px of map. That is too little to watch a rider come
           * towards you on, which is the point of the screen. Capping it and
           * letting it scroll keeps the top of the panel (where the approach
           * and the rider are) and the map both legible; above `md` the panel
           * is a side column with room of its own, so none of this applies.
           */
          className="max-h-[58dvh] space-y-4 overflow-y-auto overscroll-contain rounded-[var(--radius-sheet)] border border-hair bg-elevated p-4 shadow-[var(--shadow-sheet)] md:max-h-none md:overflow-visible md:shadow-none"
        >
          {/**
           * At phone widths the app bar floats over the map with no title, by
           * design — which left this screen with no heading at all for a
           * screen reader to land on. This supplies one without drawing
           * anything; above `md` the visible heading below takes over, so
           * there is exactly one either way.
           */}
          <h1 className="sr-only md:hidden">Your ride</h1>

          <div className="hidden items-center justify-between md:flex">
            <h1 className="font-semibold text-body">Your ride</h1>
            <StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>
          </div>

          {!finished && <TripProgress status={status} />}

          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {status === RIDE_STATUS.SEARCHING &&
                (searchOver ? (
                  <RequestExpired
                    ride={ride}
                    /**
                     * A new round has started, so this screen goes back to
                     * searching — against the NEW deadline.
                     *
                     * The deadline is taken from the response rather than
                     * waited for: `refetch` is a second round trip, and until
                     * it lands `searchExpiresAt` still holds the old, already
                     * passed deadline. That combination flashed the expired
                     * sheet straight back for a moment after a successful
                     * request. The value is still the server's — it is the
                     * `expiresAt` the dispatch just returned — so nothing here
                     * is deciding a deadline for itself.
                     */
                    onRequested={(result) => {
                      const next = result?.dispatch?.expiresAt;
                      if (next) patch({ searchExpiresAt: next });
                      setRoundEnded(false);
                      refetch();
                    }}
                    onCancel={() => setConfirmCancel(true)}
                  />
                ) : (
                  <FindingRider />
                ))}

              {ride.rider && !finished && (
                <>
                  {/**
                   * How far off they are, above who they are — while a rider is
                   * approaching, the distance is the thing being waited on, and
                   * the name is already known from the notification.
                   */}
                  {trackable && (
                    <RiderApproach
                      status={status}
                      distanceMeters={tracking.distanceMeters}
                      eta={tracking.eta}
                      stale={tracking.stale}
                      nearby={tracking.nearby}
                      onCentre={() => setCentreNonce((n) => n + 1)}
                    />
                  )}

                  <PersonCard
                    name={ride.rider.name}
                    phone={ride.rider.phone}
                    vehicle={ride.rider.vehicle}
                    rating={ride.rider.rating}
                    trips={ride.rider.totalRides}
                  />

                  {hasChat && (
                    <ChatButton
                      label={`Message ${ride.rider.name?.split(' ')[0] || 'your rider'}`}
                      unread={chatUnread}
                      onClick={() => setChatOpen(true)}
                      className="w-full justify-center"
                    />
                  )}
                </>
              )}

              {/**
                * What the wait is costing, while it is happening.
                *
                * Sits above the code because it is the thing that changes:
                * the code is a fixed four digits, the meter is a clock the
                * customer can still do something about.
                */}
              {showOtp && (
                <WaitingMeter
                  phase={ride.waiting?.pickup}
                  serverNow={ride.waiting?.serverNow}
                  kind="pickup"
                  audience="customer"
                  currency={ride.currency}
                />
              )}

              {showOtp && <OtpDisplay otp={otp} loading={otpLoading} />}

              {(status === RIDE_STATUS.OTP_VERIFIED || status === RIDE_STATUS.IN_PROGRESS) && (
                <OtpDisplay verified />
              )}

              {/* The journey is over from here on. AWAITING_PAYMENT and
                  COMPLETED differ only in whether the money has landed, so the
                  fare and the payment panel are shared; rating waits until the
                  trip is genuinely finished. */}
              {isFinished(status) && (
                <>
                  <FareSummary
                    label="Total fare"
                    fare={ride.finalFare}
                    currency={ride.currency}
                    distanceKm={ride.finalDistanceKm}
                  />
                  {/* What the total is made of, when waiting added to it. */}
                  {showBreakdown && <FareBreakdown ride={ride} />}

                  {/* The clock the customer can still stop, by paying. */}
                  <WaitingMeter
                    phase={ride.waiting?.payment}
                    serverNow={ride.waiting?.serverNow}
                    kind="payment"
                    audience="customer"
                    currency={ride.currency}
                  />

                  <PaymentPanel
                    rideId={rideId}
                    payment={ride.payment}
                    amount={ride.finalFare}
                    currency={ride.currency}
                    onChanged={refetch}
                  />
                  {status === RIDE_STATUS.COMPLETED && (
                    <RateTrip
                      rideId={rideId}
                      side="rider"
                      personName={ride.rider?.name}
                      rating={ride.rating}
                      onRated={refetch}
                    />
                  )}
                </>
              )}

              {status === RIDE_STATUS.CANCELLED && (
                <div className="flex items-start gap-3 rounded-2xl border border-hair bg-sunken p-4">
                  <CircleSlash className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                  <div>
                    <p className="font-semibold text-body">Ride cancelled</p>
                    <p className="text-sm text-muted">
                      {ride.cancellation?.by === 'rider'
                        ? 'Your rider cancelled this ride.'
                        : 'This ride was cancelled.'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <RoutePreview
            compact
            className="border-t border-hair pt-4"
            pickup={ride.pickup?.address}
            destination={ride.destination?.address}
          />

          {!finished && (
            <div className="flex items-baseline justify-between border-t border-hair pt-3 text-sm">
              <span className="text-muted">Estimated fare</span>
              <span className="tabular text-lg font-semibold text-body">
                {formatMoney(ride.estimatedFare, ride.currency)}
              </span>
            </div>
          )}

          {canCancel && (
            <Button variant="danger" block onClick={() => setConfirmCancel(true)}>
              <XCircle aria-hidden />
              Cancel ride
            </Button>
          )}

          {finished && (
            <Button block onClick={() => navigate('/')}>
              <Home aria-hidden />
              Book another ride
            </Button>
          )}
        </motion.div>
      </div>

      <CancelSheet
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        side="customer"
        ride={ride}
        busy={cancelling}
        onConfirm={handleCancel}
      />

      {hasChat && (
        <ChatSheet
          rideId={rideId}
          open={chatOpen}
          onOpenChange={(next) => {
            setChatOpen(next);
            // Closing clears the badge the sheet has just marked read.
            if (!next) refreshChatUnread();
          }}
          otherName={ride.rider?.name}
          otherRole="rider"
        />
      )}
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="flex h-dvh flex-col">
      <Skeleton className="flex-1 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
