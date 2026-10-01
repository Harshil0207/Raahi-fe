import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { MapShell, MapButton } from '@/components/map/MapShell';
import { GlassSurface } from '@/components/ui/glass';
import { Skeleton } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { GoButton } from '@/components/rider/GoButton';
import { AlertToggle } from '@/components/rider/AlertToggle';
import { LocationPrompt } from '@/components/rider/LocationPrompt';
import { StatusSheet } from '@/components/rider/StatusSheet';
import { IncomingRequest } from '@/components/rider/IncomingRequest';
import { useAuth } from '@/hooks/useAuth';
import { useRiderLocation } from '@/hooks/useRiderLocation';
import { useSocketEvents, useSocketStatus } from '@/hooks/useSocket';
import { useRideAlerts } from '@/hooks/useRideAlerts';
import * as riderApi from '@/services/rider.api';
import { formatMoney } from '@/utils/format';
import { SOCKET_EVENTS } from '@/constants/socketEvents';

/**
 * The driving screen: a map with the rider on it, a strip of state over it, and
 * one control.
 *
 * Everything that is not those three things lives a tab away — earnings, trips,
 * statistics — because a rider looks at this screen while parked at a junction
 * with the engine running, and a dashboard of cards is the wrong thing to read
 * there.
 */
export default function RiderDashboard() {
  const { rider, setRider } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(Boolean(rider?.isOnline));
  const [toggling, setToggling] = useState(false);
  const [offers, setOffers] = useState([]);
  const [responding, setResponding] = useState(false);
  const [activeRide, setActiveRide] = useState(undefined);
  const [earnings, setEarnings] = useState(null);
  // What the rider owes the platform. Carried on the profile so the first paint
  // already knows whether they are blocked, rather than finding out on the tap.
  const [wallet, setWallet] = useState(null);
  // Re-renders the online timer once a minute; nothing else depends on it.
  const [minuteTick, setMinuteTick] = useState(0);

  const location = useRiderLocation({ enabled: true, onActiveRide: false });

  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [isOnline]);

  // A rider mid-ride belongs on the ride screen, not here.
  useEffect(() => {
    riderApi
      .getActiveRide()
      .then(setActiveRide)
      .catch(() => setActiveRide(null));
  }, []);

  useEffect(() => {
    riderApi
      .getProfile()
      .then((profile) => {
        setRider(profile);
        setIsOnline(Boolean(profile.isOnline));
        if (profile.wallet) setWallet(profile.wallet);
      })
      .catch(() => {});
  }, [setRider]);

  // Today's figures come from the same server-side aggregate the Earnings
  // screen uses, so the two can never disagree.
  useEffect(() => {
    riderApi
      .getEarnings()
      .then(setEarnings)
      .catch(() => {});
  }, []);

  // Restores offers that arrived while the tab was closed; the backend filters
  // out anything already past its deadline.
  const loadOffers = useCallback(() => {
    riderApi
      .listRideRequests()
      .then((data) => setOffers(data.requests))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOnline) loadOffers();
  }, [isOnline, loadOffers]);

  /**
   * Catch up on offers after a reconnect.
   *
   * A round dispatched while this socket was down was emitted to a rider who
   * was not listening, and nothing re-sends it — so without this the card
   * never appears and the rider silently misses the work. The endpoint returns
   * only offers still inside their deadline, so nothing expired comes back.
   *
   * Only the upward transition reloads; `connected` is already true on the
   * first render, where the effect above has it covered.
   */
  const connected = useSocketStatus();
  const wasConnected = useRef(connected);
  useEffect(() => {
    const reconnected = connected && !wasConnected.current;
    wasConnected.current = connected;
    if (reconnected && isOnline) loadOffers();
  }, [connected, isOnline, loadOffers]);

  const dropOffer = useCallback((requestId) => {
    setOffers((current) => current.filter((o) => String(o.requestId) !== String(requestId)));
  }, []);

  useSocketEvents(
    {
      [SOCKET_EVENTS.RIDE_NEW]: (payload) => {
        setOffers((current) =>
          current.some((o) => String(o.requestId) === String(payload.requestId))
            ? current
            : [...current, payload]
        );
      },
      // Fires both when the window closes and when another rider wins the ride.
      // A reason means someone else took it, so the card goes at once and the
      // rider is told why. A plain timeout is left alone: the countdown has
      // already flipped the card to its expired state, and it clears itself a
      // moment later so the rider sees what happened instead of a card
      // vanishing mid-glance.
      [SOCKET_EVENTS.RIDE_EXPIRED]: (payload) => {
        if (!payload?.reason) return;
        toast.info(payload.reason);
        if (payload.requestId) dropOffer(payload.requestId);
        else if (payload.rideId) {
          setOffers((current) => current.filter((o) => String(o.rideId) !== String(payload.rideId)));
        }
      },
      [SOCKET_EVENTS.RIDE_CANCELLED]: (payload) => {
        if (payload?.requestId) dropOffer(payload.requestId);
      },
      // A settled cash ride moves the balance, and it can push a rider over the
      // ceiling while they are still online. The block applies to the next trip
      // rather than this screen: nothing here takes them offline.
      [SOCKET_EVENTS.WALLET_UPDATED]: (payload) => setWallet(payload)
    },
    [dropOffer]
  );

  /**
   * The chime for incoming work.
   *
   * Driven by the offer list and by being online, both of which are state up
   * here — so this sits above the early returns below, where hooks have to be.
   * The list is also what the rider can see, which is why the sound is keyed on
   * it rather than on the socket event: a request restored after a reconnect is
   * not new, and should not announce itself again.
   */
  const alerts = useRideAlerts(isOnline ? offers : [], isOnline && !activeRide);

  async function toggleOnline(next) {
    setToggling(true);

    /**
     * Going online is a tap, and a tap is the gesture a browser requires before
     * it will let a page make a sound. Unlocking here means the rider who never
     * finds the alerts control still gets the chime, because the one action
     * they always take is the one that grants it.
     */
    if (next && alerts.wanted && !alerts.on) await alerts.enable();

    try {
      const profile = await riderApi.setOnline(next);
      setRider(profile);
      setIsOnline(profile.isOnline);
      toast.success(profile.isOnline ? "You're online" : "You're offline");
    } catch (err) {
      // The server refuses some of these — going offline mid-ride, going online
      // without a location — so the state only ever moves on a success.
      toast.error(err.message);
      setIsOnline((v) => v);
    } finally {
      setToggling(false);
    }
  }

  async function accept(offer) {
    setResponding(true);
    try {
      const result = await riderApi.acceptRequest(offer.requestId);
      dropOffer(offer.requestId);
      toast.success('Ride accepted');
      navigate(`/rider/ride/${result.ride._id}`);
    } catch (err) {
      // 409 means expired, already taken, or the rider is no longer available.
      dropOffer(offer.requestId);
      toast.error(err.message);
    } finally {
      setResponding(false);
    }
  }

  async function reject(offer) {
    setResponding(true);
    try {
      await riderApi.rejectRequest(offer.requestId);
    } catch {
      // Rejecting is advisory; the offer disappears locally either way.
    } finally {
      dropOffer(offer.requestId);
      setResponding(false);
    }
  }

  if (activeRide === undefined) {
    return (
      <div className="min-h-dvh bg-app p-4 pb-safe-nav">
        <Skeleton className="h-full min-h-[60dvh] w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (activeRide) return <Navigate to={`/rider/ride/${activeRide._id}`} replace />;

  // Offers only mean anything while online, so filter rather than clearing state.
  const visibleOffers = isOnline ? offers : [];
  const current = visibleOffers[0] ?? null;

  const hasLocation = Boolean(location.position);

  /**
   * Why the rider cannot go on the road, if they cannot.
   *
   * Both reasons are enforced by the backend — this only decides what the
   * button says. A rider who owes too much is the more important of the two,
   * because the fix is a payment rather than a permission, so it wins when both
   * apply and it comes with somewhere to go.
   */
  const blockedByBalance = Boolean(wallet && !wallet.canGoOnline);
  const cannotGoOnline = !isOnline && (blockedByBalance || !hasLocation);
  const blockHint = !isOnline
    ? blockedByBalance
      ? `You owe ${formatMoney(wallet.outstanding, wallet.currency)}. Recharge to go online.`
      : // The card above already explains the location block and carries the
        // action, so the caption only names it — and never tells a rider to
        // "share your location" when the browser will not let them.
        !hasLocation
        ? location.isLocating
          ? 'Finding your location…'
          : 'Waiting for your location'
        : undefined
    : undefined;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden md:h-full md:min-h-dvh">
      <div className="absolute inset-0">
        <MapShell
          className="h-full w-full"
          self={location.position}
          fit
          resizeTrigger={`${isOnline}-${hasLocation}`}
        />
      </div>

      <header className="pointer-events-none relative z-10 flex items-start justify-between gap-3 px-4 pt-safe">
        <GlassSurface
          cornerRadius={20}
          blurAmount={18}
          displacementScale={6}
          mode="polar"
          className="pointer-events-auto px-3.5 py-2"
        >
          <h1 className="text-sm font-semibold leading-tight text-body">Drive</h1>
          <p className="text-[11.5px] leading-tight text-muted">
            {isOnline ? 'Waiting for requests' : 'Currently offline'}
          </p>
        </GlassSurface>

        <div className="pointer-events-auto flex items-center gap-2">
          <AlertToggle on={alerts.on} needsGesture={alerts.needsGesture} onToggle={alerts.toggle} />

          <MapButton
            icon={LocateFixed}
            label="Use my current location"
            onClick={location.request}
            disabled={location.status === 'prompting'}
          />
        </div>
      </header>

      {/* The tab bar floats over this screen, so the whole bottom stack clears
          it with `pb-safe-nav` — the same allowance every other floating screen
          uses — and the GO button carries a little margin of its own on top of
          that, so a round control never sits flush against the nav's edge. */}
      <div className="relative z-10 mt-auto flex flex-col items-center gap-3 px-3 pb-safe-nav md:mx-auto md:w-full md:max-w-md">
        <StatusSheet
          className="w-full"
          isOnline={isOnline}
          wallet={wallet}
          onlineFor={formatOnline(isOnline, rider, minuteTick)}
          earnings={earnings}
          hasLocation={hasLocation}
          lastSentAt={location.lastSentAt}
        />

        {/**
         * The location block, where it is felt.
         *
         * Shown only while offline and without a fix: once the rider is on the
         * road there is nothing to ask for, and a card that stays behind would
         * just be covering the map. It sits above the disc rather than inside
         * the status card, because the status card is collapsed by default and
         * an instruction nobody can see is not an instruction.
         */}
        {!isOnline && !hasLocation && (
          <LocationPrompt
            className="w-full"
            isDenied={location.isDenied}
            isInsecure={location.isInsecure}
            canPrompt={location.canPrompt}
            isLocating={location.isLocating}
            error={location.error}
            onRequest={location.request}
          />
        )}

        <GoButton
          className="mb-4"
          isOnline={isOnline}
          busy={toggling}
          disabled={cannotGoOnline}
          hint={blockHint}
          action={
            blockedByBalance ? (
              <Button size="sm" variant="outline" className="h-11" onClick={() => navigate('/rider/wallet')}>
                Recharge balance
              </Button>
            ) : null
          }
          onToggle={toggleOnline}
        />
      </div>

      {/* A request outranks everything above: it is modal, so the status strip
          and the GO button are covered and inert while it counts down. */}
      <IncomingRequest
        request={current}
        busy={responding}
        onAccept={accept}
        onReject={reject}
        onExpire={(offer) => {
          // The server has already closed it; hold the expired state briefly so
          // the rider registers what happened, then clear it.
          setTimeout(() => dropOffer(offer.requestId), 2500);
        }}
      />
    </div>
  );
}

/**
 * Time online in the current session, banked seconds aside. The server owns the
 * lifetime total; this is only the session the rider can see for themselves.
 */
// eslint-disable-next-line no-unused-vars -- `tick` only exists to re-run this on a timer.
function formatOnline(isOnline, rider, tick) {
  if (!isOnline) return 'Offline';
  // The server stamps the start of the session. Until that stamp arrives the
  // honest answer is that the session has started, not that it is zero minutes
  // long and not — as the control below would contradict — that it is off.
  if (!rider?.onlineSince) return 'Online';

  const mins = Math.floor((Date.now() - new Date(rider.onlineSince).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
