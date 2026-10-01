import { ROLES } from '@/constants/ride';

/**
 * Where a signed-in person belongs right now.
 *
 * Not just "which app" any more. An account can exist without everything Raahi
 * needs to use it — a Google sign-up arrives with a name and a verified address
 * and no phone number, and a Google rider arrives with no vehicle and no
 * licence — so this answers the fuller question the guards actually ask: given
 * this account, in this state, what is the next screen?
 *
 * The order is the order the steps have to happen in. Each one is a real
 * blocker for the one below it:
 *
 *   1. A rider with no rider profile cannot be shown a rider dashboard; there
 *      is nothing behind it. They go and supply a vehicle.
 *   2. Anyone with no phone number cannot have a ride dispatched to them.
 *   3. Everything else is their home screen.
 *
 * Verification status is deliberately NOT a step here. A rider waiting for
 * approval belongs on their dashboard, which tells them so — sending them to a
 * dead-end screen would leave them unable to reach their profile, their earnings
 * or support while they wait.
 */
export function homeFor(role, user = null, rider = null) {
  const isRider = role === ROLES.RIDER;

  if (isRider && user && !rider) return '/rider/onboarding';
  if (user && user.profileComplete === false) return '/complete-profile';

  return isRider ? '/rider' : '/';
}

/**
 * Where to go after signing in, honouring wherever they were headed.
 *
 * An intended route only wins when the account can actually use it: sending
 * somebody straight to `/rider/wallet` when they have not finished signing up
 * lands them on a screen with nothing on it. So the onboarding answer above
 * takes precedence, and the remembered destination applies once there is
 * nothing left to finish.
 */
export function afterAuth(session, intended) {
  const destination = homeFor(session?.user?.role, session?.user, session?.rider);

  const needsOnboarding = destination === '/rider/onboarding' || destination === '/complete-profile';
  if (needsOnboarding) return destination;

  return intended || destination;
}
