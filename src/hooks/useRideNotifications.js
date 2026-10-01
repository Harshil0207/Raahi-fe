import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SOCKET_EVENTS } from '@/constants/socketEvents';
import { useSocketEvents } from '@/hooks/useSocket';
import { useSetting } from '@/hooks/useUserSettings';
import { notificationSound } from '@/lib/notificationSound';
import { armAudioOnNextGesture } from '@/lib/audio';

/**
 * The customer's ride alerts: one listener, for the whole app.
 *
 * MOUNTED ONCE, ABOVE EVERY CUSTOMER SCREEN, and that placement is the design
 * rather than a convenience. Putting this on the tracking page would register a
 * listener each time that page mounted and tear it down each time it did not —
 * so an alert would fire twice if two screens carried it, and not at all if the
 * customer was on the home screen when the rider accepted. One subscription,
 * alive for as long as the customer is signed in, has neither problem.
 *
 * THE SOUND AND THE ALERT ARE SEPARATE DECISIONS. The toast always appears and
 * the ride state always updates; the sound is what the settings switch. A
 * person who wants quiet is not a person who wants to miss their ride.
 *
 * WHY NEITHER CAN REPEAT. Every event claims a key of `rideId:EVENT`, spent in
 * one place and mirrored into sessionStorage. A remount, a navigation, a socket
 * reconnect that redelivers, two tabs, or a refresh all arrive at a key that is
 * already spent, and the claim decides the alert and the sound together — one
 * decision, one guard, so there is nothing for a second guard to hide. This
 * does not live in React state on purpose: state is forgotten on unmount and
 * read stale when two events land in the same tick, and both of those are
 * precisely the cases this exists for.
 */
/** Everything except a repeat is worth telling the customer about. */
const shouldShow = (outcome) => outcome !== 'duplicate' && outcome !== 'unknown';

export function useRideNotifications() {
  const soundOn = useSetting('notifications.sound', true);
  const acceptedSound = useSetting('notifications.rideAcceptedSound', true);
  const arrivedSound = useSetting('notifications.riderArrivedSound', true);

  /**
   * Settings, read through a ref inside the handlers.
   *
   * The socket handlers are bound once. Reading the values directly would
   * capture whatever they were at that moment, so a switch flipped mid-ride
   * would not take effect until something else forced a re-subscribe.
   */
  const wanted = useRef({ soundOn, acceptedSound, arrivedSound });
  useEffect(() => {
    wanted.current = { soundOn, acceptedSound, arrivedSound };
  }, [soundOn, arrivedSound, acceptedSound]);

  /**
   * Arm the audio on the customer's next gesture, whatever it is for.
   *
   * A browser will not let a page make a noise until it has seen a real
   * interaction, and a customer never presses anything equivalent to the
   * rider's GO switch — they open the app and wait. So this listens for the
   * next tap anywhere: opening the destination picker, panning the map,
   * anything. It does not work around the browser rule, it just stops
   * insisting on one particular button.
   */
  useEffect(() => armAudioOnNextGesture(), []);

  /**
   * Announces one event, at most once ever.
   *
   * Returns why, and the caller shows the alert on anything but `duplicate` —
   * so the sound and the alert are decided by the SAME claim on the same key,
   * made in one place. An earlier version checked the ledger here as well as
   * inside the sound; with two guards for one decision, breaking either one
   * changed nothing observable, which meant neither was ever really tested.
   *
   * When the sound is switched off the key is still claimed, so turning it back
   * on mid-ride does not produce a sound for something that already happened —
   * and a redelivery of that muted event still returns `duplicate`, so it does
   * not raise a second alert either.
   */
  const announce = useCallback((rideId, event, play) => {
    if (!rideId) return 'unknown';

    const key = `${rideId}:${event}`;
    const settings = wanted.current;
    const allowed =
      settings.soundOn &&
      (event === 'RIDE_ACCEPTED' ? settings.acceptedSound : settings.arrivedSound);

    if (!allowed) return notificationSound.claim(key) ? 'muted' : 'duplicate';

    return play(rideId);
  }, []);

  useSocketEvents(
    {
      [SOCKET_EVENTS.RIDE_ACCEPTED]: (payload) => {
        const rideId = payload?.rideId;
        const outcome = announce(rideId, 'RIDE_ACCEPTED', (id) =>
          notificationSound.playRideAccepted(id)
        );
        if (!shouldShow(outcome)) return;

        const rider = payload?.rider;
        toast.success('Ride accepted', {
          description: rider?.name
            ? `${rider.name} is on the way${rider.vehicle?.numberPlate ? ` — ${rider.vehicle.numberPlate}` : ''}.`
            : 'Your rider is on the way to pick you up.'
        });
      },

      [SOCKET_EVENTS.RIDE_ARRIVED]: (payload) => {
        const rideId = payload?.rideId;
        const outcome = announce(rideId, 'RIDER_ARRIVED', (id) =>
          notificationSound.playRiderArrived(id)
        );
        if (!shouldShow(outcome)) return;

        const who = payload?.rider?.name;
        toast.info('Your rider has arrived', {
          description: who
            ? `${who} is at the pickup point. Share your code to start the trip.`
            : 'They are at the pickup point. Share your code to start the trip.'
        });
      }
    },
    // Bound once. The handlers read settings through the ref above, so nothing
    // here needs to change when a switch does.
    []
  );

  // A tab going away should not leave a note hanging.
  useEffect(() => () => notificationSound.stop(), []);
}
