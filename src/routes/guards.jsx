import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import { homeFor } from './homeFor';

/** Signed-in users only. Waits for session restoration so a refresh isn't a logout. */
export function RequireAuth() {
  const { isAuthenticated, restoring } = useAuth();
  const location = useLocation();

  if (restoring) return <FullPageLoader label="Restoring your session" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/** Keeps each role inside its own app rather than showing a permission error. */
export function RequireRole({ role }) {
  const { role: currentRole, user, rider, restoring } = useAuth();

  if (restoring) return <FullPageLoader />;
  if (currentRole !== role) return <Navigate to={homeFor(currentRole, user, rider)} replace />;

  return <Outlet />;
}

/**
 * Nobody reaches the app itself with half an account.
 *
 * An account can exist without the things Raahi needs to use it: a Google
 * sign-up has no phone number, and a Google rider has no vehicle. Guarding only
 * the redirect after sign-in would leave every one of those screens reachable
 * by typing the URL, refreshing, or following a link from a notification — and
 * a home screen with no phone number behind it fails in ways that look like
 * bugs rather than like an unfinished sign-up.
 *
 * NO LOOP IS POSSIBLE HERE: this wraps the app routes, and the onboarding
 * screens it sends people to sit outside it. `homeFor` returning an onboarding
 * path is exactly the condition for redirecting, so once that path stops being
 * returned the redirect stops happening.
 */
export function RequireOnboarded() {
  const { user, rider, role, restoring } = useAuth();
  const location = useLocation();

  if (restoring) return <FullPageLoader />;

  const destination = homeFor(role, user, rider);
  const unfinished = destination === '/rider/onboarding' || destination === '/complete-profile';

  if (unfinished && location.pathname !== destination) {
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}

/**
 * The onboarding screens themselves.
 *
 * The mirror of the guard above: somebody who has nothing left to finish has no
 * business on a "complete your profile" screen, so they are sent home. Without
 * this, a bookmarked onboarding URL would show a finished account a form it has
 * already filled in.
 */
export function RequireUnfinished() {
  const { user, rider, role, restoring } = useAuth();

  if (restoring) return <FullPageLoader />;

  const destination = homeFor(role, user, rider);
  const unfinished = destination === '/rider/onboarding' || destination === '/complete-profile';

  if (!unfinished) return <Navigate to={destination} replace />;

  return <Outlet />;
}

/**
 * Login and register: already signed in means go wherever they belong.
 *
 * IT HONOURS THE INTENDED ROUTE TOO, and that is not redundancy. Signing in
 * applies the session, React re-renders, and this guard and the screen's own
 * `navigate` both react to that — whichever runs first decides where the person
 * lands. When only the screen knew about the destination, winning that race
 * sent somebody who had asked for `/payments` to the home screen instead,
 * depending on render timing. Both paths now agree, so the race has no losing
 * side.
 */
export function RedirectIfAuthenticated() {
  const { isAuthenticated, role, user, rider, restoring } = useAuth();
  const location = useLocation();

  if (restoring) return <FullPageLoader />;

  if (isAuthenticated) {
    const destination = homeFor(role, user, rider);
    const unfinished = destination === '/rider/onboarding' || destination === '/complete-profile';
    const intended = location.state?.from?.pathname;

    // An unfinished account goes to onboarding regardless of where it was
    // headed — the destination would be a screen it cannot use yet.
    return <Navigate to={unfinished ? destination : intended || destination} replace />;
  }

  return <Outlet />;
}
