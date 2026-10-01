import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, CheckCircle2, Flag, MapPin, Navigation, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MapShell } from '@/components/map/MapShell';
import { AppBar } from '@/components/common/AppBar';
import { ChatButton } from '@/components/chat/ChatButton';
import { ChatSheet } from '@/components/chat/ChatSheet';
import { useChatUnread } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { StatusBadge, Skeleton } from '@/components/ui/misc';
import { RoutePreview } from '@/components/ride/RoutePreview';
import { FareSummary } from '@/components/ride/FareSummary';
import { TripProgress } from '@/components/ride/TripProgress';
import { OtpInput } from '@/components/ride/OtpInput';
import { WaitingMeter } from '@/components/ride/WaitingMeter';
import { FareBreakdown } from '@/components/ride/FareBreakdown';
import { LocationPrompt } from '@/components/rider/LocationPrompt';
import { CollectFare, EarningBreakdown } from '@/components/rider/CollectFare';
import { useRide } from '@/hooks/useRide';
import { useRiderLocation } from '@/hooks/useRiderLocation';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import * as rideApi from '@/services/ride.api';
import * as paymentApi from '@/services/payment.api';
import {
  RIDE_STATUS,
  STATUS_LABEL,
  STATUS_TONE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  OTP_LENGTH,
  isFinished
} from '@/constants/ride';
import { SOCKET_EVENTS } from '@/constants/socketEvents';
import { useSocketEvents } from '@/hooks/useSocket';
import { pointToLatLng } from '@/utils/geo';
import { formatDistance, formatMoney } from '@/utils/format';
import { CancelSheet } from '@/components/ride/CancelSheet';
import { RateTrip } from '@/components/ride/RateTrip';

// Long enough to read the tick on the code before the sheet moves on, and
// skipped entirely for anyone who has asked for less motion.
const settle = () =>
  new Promise((resolve) =>
    setTimeout(resolve, window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 0 : 520)
  );

export default function RiderActiveRide() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { ride, loading, error, refetch } = useRide(rideId);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // What the rider kept, and where that leaves their balance. Arrives on the
  // socket the moment the ledger is posted; the customer is never sent it.
  const [earning, setEarning] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [methods, setMethods] = useState(null);

  // The rider has the chat from the moment they accept, which is the point:
  // "I'm the black Swift by the gate" saves a phone call.
  const { unread: chatUnread, refresh: refreshChatUnread } = useChatUnread();

  const status = ride?.status;
  const onTrip = status === RIDE_STATUS.IN_PROGRESS;
  const collecting = status === RIDE_STATUS.AWAITING_PAYMENT;

  useSocketEvents(
    {
      /**
       * The server decided the rider is at the pickup.
       *
       * Proximity can move the ride to ARRIVED without the rider touching
       * anything, so this screen cannot assume its own button was the cause.
       * Re-reading is enough: the step, the OTP field and the buttons all come
       * from the ride.
       */
      [SOCKET_EVENTS.RIDE_ARRIVED]: () => refetch(),
      [SOCKET_EVENTS.RIDE_COMPLETED]: (payload) => {
        if (payload?.earning) setEarning(payload.earning);
        if (payload?.wallet) setWallet(payload.wallet);
        refetch();
      },
      [SOCKET_EVENTS.PAYMENT_UPDATED]: () => refetch()
    },
    [refetch]
  );

  // Which methods the platform is accepting, and why one is off if it is.
  // Fetched once the fare is due rather than on mount: before that there is
  // nothing to collect and nothing to decide.
  useEffect(() => {
    if (!collecting || methods) return;
    paymentApi
      .getMethodOptions()
      .then((result) => setMethods(result.methods))
      .catch(() => setMethods(null));
  }, [collecting, methods]);

  const platform = usePlatformSettings();

  /**
   * Streaming stops when the ride does.
   *
   * `enabled` was hard-coded true, so the GPS watcher kept running — and kept
   * posting — after the trip was completed or cancelled, for as long as this
   * screen stayed open. The backend drops those updates once the rider has no
   * active ride, so nothing leaked; the phone was simply holding a GPS watch
   * for a journey that had finished.
   *
   * `onActiveRide` is a separate question: it only decides how OFTEN to send
   * while the ride is live.
   */
  const riding = Boolean(status) && !isFinished(status) && status !== RIDE_STATUS.CANCELLED;

  const location = useRiderLocation({ enabled: riding, onActiveRide: riding });

  /**
   * How many digits the pickup code has.
   *
   * `ride.otpLength` is an admin setting between 4 and 6. This screen drew four
   * boxes and gated submission on exactly four, so raising the setting left the
   * rider unable to type a full code or press the button. The constant is only
   * the fallback for a settings fetch that has not landed yet.
   */
  const otpLength = platform?.ride?.otpLength || OTP_LENGTH;

  const pickup = useMemo(() => pointToLatLng(ride?.pickup?.location), [ride]);
  const destination = useMemo(() => pointToLatLng(ride?.destination?.location), [ride]);

  // Typing clears the previous failure — handled where it happens, not in an effect.
  const changeOtp = (next) => {
    setOtp(next);
    setOtpError(null);
  };

  async function run(label, fn) {
    setWorking(true);
    try {
      await fn();
      await refetch();
      if (label) toast.success(label);
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setWorking(false);
    }
  }

  async function submitOtp(code = otp) {
    if (code.length !== otpLength || working) return;

    setWorking(true);
    try {
      await rideApi.verifyOtp(rideId, code);
      // The boxes turn green and hold for a beat before the sheet swaps, so the
      // rider sees the code was accepted rather than just seeing it disappear.
      setOtpVerified(true);
      toast.success('Code verified');
      // Verification and start are separate states on the backend; the rider
      // experiences them as one action.
      await Promise.all([rideApi.startRide(rideId), settle()]);
      await refetch();
      setOtp('');
      setOtpVerified(false);
    } catch (err) {
      // The digits stay. A rejected code is nearly always one wrong digit, and
      // making them retype the rest to fix it is the worst part of this screen.
      setOtpVerified(false);
      setOtpError(err.message);
      await refetch();
    } finally {
      setWorking(false);
    }
  }

  async function complete() {
    const travelled = location.position && ride?.estimatedDistanceKm;
    // This ends the journey; it does not end the ride. The fare is fixed here
    // and the ride waits in AWAITING_PAYMENT until the money is actually in.
    await run('Trip ended — collect the fare', () =>
      // The server validates this against its own estimate and ignores it if
      // it looks wrong, so sending it is a hint, not a claim.
      rideApi.completeRide(rideId, travelled ? { distanceKm: ride.estimatedDistanceKm } : {})
    );
  }

  if (loading) {
    return (
      <div className="flex h-dvh flex-col">
        <Skeleton className="flex-1 rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !ride) return <Navigate to="/rider" replace />;

  const finished = status === RIDE_STATUS.COMPLETED || status === RIDE_STATUS.CANCELLED;
  const canCancel = !finished && !ride.otp?.verifiedAt;

  // Before pickup the rider heads to the customer; after, to the destination.
  const target = onTrip ? destination : pickup;

  return (
    <div className="relative flex h-dvh flex-col md:flex-row">
      <div className="absolute inset-0 md:relative md:flex-1">
        <MapShell
          className="h-full w-full"
          self={location.position}
          pickup={pickup}
          destination={destination}
          resizeTrigger={status}
        />
      </div>

      <AppBar
        floating
        className="md:hidden"
        back="/rider"
        right={<StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>}
      />

      <div className="relative z-10 mt-auto w-full px-3 pb-3 md:mt-0 md:w-[26rem] md:shrink-0 md:overflow-y-auto md:p-4">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="space-y-4 rounded-[var(--radius-sheet)] border border-hair bg-elevated p-4 shadow-[var(--shadow-sheet)] md:shadow-none"
        >
          {/**
           * The phone app bar floats over the map without a title, so without
           * this the screen has no heading for a screen reader. Hidden above
           * `md`, where the visible heading below serves the same purpose —
           * one announced H1 at every width.
           */}
          <h1 className="sr-only md:hidden">Active ride</h1>

          <div className="hidden items-center justify-between md:flex">
            <h1 className="font-semibold text-body">Active ride</h1>
            <StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>
          </div>

          {!finished && <TripProgress status={status} />}

          {/**
            * The rider's side of the clock.
            *
            * Shown at the pickup while they wait for the customer, and at the
            * drop-off while they wait to be paid. Same timestamps, same
            * correction for clock drift as the customer's screen, so the two
            * people standing next to each other cannot see different numbers.
            */}
          {status === RIDE_STATUS.ARRIVED && (
            <WaitingMeter
              phase={ride.waiting?.pickup}
              serverNow={ride.waiting?.serverNow}
              kind="pickup"
              audience="rider"
              currency={ride.currency}
            />
          )}

          {status === RIDE_STATUS.AWAITING_PAYMENT && (
            <WaitingMeter
              phase={ride.waiting?.payment}
              serverNow={ride.waiting?.serverNow}
              kind="payment"
              audience="rider"
              currency={ride.currency}
            />
          )}

          {finished && <FareBreakdown ride={ride} />}

          {/**
            * Tracking is off and the rider needs to know.
            *
            * The customer is watching a marker that has stopped moving, and
            * without this the rider has no idea why — the position simply
            * stops going out. It appears only while the ride is live and the
            * app genuinely has no fix, so a rider whose GPS is working never
            * sees it.
            */}
          {riding && !location.position && (location.isDenied || location.isInsecure || location.canPrompt) && (
            <LocationPrompt
              className="w-full"
              reason="ride"
              isDenied={location.isDenied}
              isInsecure={location.isInsecure}
              canPrompt={location.canPrompt}
              isLocating={location.isLocating}
              error={location.error}
              onRequest={location.request}
            />
          )}

          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {finished ? 'You earned' : 'Trip fare'}
              </p>
              <p className="tabular text-3xl font-semibold text-body">
                {formatMoney(ride.finalFare ?? ride.estimatedFare, ride.currency)}
              </p>
            </div>
            <p className="tabular shrink-0 text-sm text-muted">
              {formatDistance(ride.finalDistanceKm ?? ride.estimatedDistanceKm)}
            </p>
          </div>

          <RoutePreview
            compact
            className="border-t border-hair pt-4"
            pickup={ride.pickup?.address}
            destination={ride.destination?.address}
          />

          {!finished && (
            <div className="flex gap-2">
              {target && (
                <Button asChild variant="outline" block>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation aria-hidden />
                    Navigate to {onTrip ? 'destination' : 'pickup'}
                  </a>
                </Button>
              )}

              <ChatButton
                label="Message"
                unread={chatUnread}
                onClick={() => setChatOpen(true)}
                className="shrink-0"
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              {status === RIDE_STATUS.ACCEPTED && (
                <Button block size="lg" loading={working} onClick={() => run('On your way', () => rideApi.markArriving(rideId))}>
                  <Navigation aria-hidden />
                  Start heading to pickup
                </Button>
              )}

              {(status === RIDE_STATUS.ACCEPTED || status === RIDE_STATUS.ARRIVING) && (
                <Button
                  block
                  size="lg"
                  variant={status === RIDE_STATUS.ARRIVING ? 'primary' : 'outline'}
                  loading={working}
                  onClick={() => run('Arrived at pickup', () => rideApi.markArrived(rideId))}
                >
                  <MapPin aria-hidden />
                  I&apos;ve arrived
                </Button>
              )}

              {status === RIDE_STATUS.ARRIVED && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-body">Ask the customer for their code</p>
                    <p className="text-xs text-muted">The trip starts once it checks out.</p>
                  </div>

                  <OtpInput
                    label="Pickup code"
                    length={otpLength}
                    value={otp}
                    onChange={changeOtp}
                    onComplete={submitOtp}
                    loading={working && !otpVerified}
                    verified={otpVerified}
                    invalid={Boolean(otpError)}
                    error={otpError}
                  />

                  <Button
                    block
                    size="lg"
                    loading={working}
                    disabled={otp.length !== otpLength}
                    onClick={() => submitOtp()}
                  >
                    Verify and start trip
                  </Button>
                </div>
              )}

              {status === RIDE_STATUS.OTP_VERIFIED && (
                <Button block size="lg" loading={working} onClick={() => run('Trip started', () => rideApi.startRide(rideId))}>
                  Start trip
                </Button>
              )}

              {onTrip && (
                <Button block size="lg" loading={working} onClick={complete}>
                  <Flag aria-hidden />
                  Complete trip
                </Button>
              )}

              {collecting && (
                <div className="space-y-3">
                  <FareSummary
                    label="Collect from customer"
                    fare={ride.finalFare}
                    currency={ride.currency}
                    distanceKm={ride.finalDistanceKm}
                  />

                  <CollectFare
                    ride={ride}
                    payment={ride.payment}
                    methods={methods}
                    busy={working}
                    onSettled={() => refetch()}
                  />
                </div>
              )}

              {status === RIDE_STATUS.COMPLETED && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--success-edge)] bg-[var(--success-wash)] p-4">
                    <CheckCircle2 className="size-5 shrink-0 text-[var(--success)]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-body">Trip complete</p>
                      <p className="text-[12.5px] text-muted">
                        {formatMoney(ride.finalFare, ride.currency)} ·{' '}
                        {ride.payment?.method === PAYMENT_METHOD.CASH ? 'Cash' : 'Paid online'}
                      </p>
                    </div>
                  </div>

                  {/* Only the rider sees this. A customer is never shown their
                      driver's commission or what they owe the platform. */}
                  <EarningBreakdown earning={earning} wallet={wallet} currency={ride.currency} />

                  <RateTrip
                    rideId={rideId}
                    side="customer"
                    personName={ride.customer?.name}
                    rating={ride.customerRating}
                    onRated={refetch}
                  />

                  <Button variant="outline" block onClick={() => navigate('/rider')}>
                    Back to driving
                  </Button>
                </div>
              )}

              {status === RIDE_STATUS.CANCELLED && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl bg-sunken p-4">
                    <XCircle className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                    <div>
                      <p className="font-semibold text-body">Ride cancelled</p>
                      <p className="text-sm text-muted">
                        Cancelled by the {ride.cancellation?.by || 'customer'}. You&apos;re available again.
                      </p>
                      {ride.cancellation?.by === 'rider' && ride.cancellation?.fee > 0 && (
                        <p className="mt-1 text-sm text-body">
                          A {formatMoney(ride.cancellation.fee, ride.currency)} cancellation fee was charged to
                          your wallet.
                        </p>
                      )}
                    </div>
                  </div>
                  <Button block onClick={() => navigate('/rider')}>
                    Back to driving
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {canCancel && (
            <Button variant="ghost" block onClick={() => setConfirmCancel(true)}>
              Cancel this ride
            </Button>
          )}
        </motion.div>
      </div>

      <CancelSheet
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        side="rider"
        ride={ride}
        busy={working}
        onConfirm={async (reason) => {
          try {
            /**
             * The fee has to be said here, not on the cancelled screen.
             *
             * This navigates straight back to the home screen, so the panel
             * that reports a charge is only ever seen when the OTHER side
             * cancelled — a rider who cancels their own ride was being charged
             * and sent away without a word about it. The amount comes from the
             * cancelled ride the server returns, so it is what was actually
             * taken rather than what the sheet warned might be.
             */
            let charged = 0;
            await run(null, async () => {
              const cancelled = await rideApi.cancelRide(rideId, reason);
              charged = cancelled?.cancellation?.fee || 0;
            });

            toast.success(
              charged > 0
                ? `Ride cancelled. A ${formatMoney(charged, ride.currency)} cancellation fee was charged to your wallet.`
                : 'Ride cancelled'
            );
            setConfirmCancel(false);
            navigate('/rider', { replace: true });
          } catch {
            setConfirmCancel(false);
          }
        }}
      />

      <ChatSheet
        rideId={rideId}
        open={chatOpen}
        onOpenChange={(next) => {
          setChatOpen(next);
          if (!next) refreshChatUnread();
        }}
        otherName={ride.customer?.name}
        otherRole="customer"
      />
    </div>
  );
}
