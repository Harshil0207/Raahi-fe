import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuthEntrance } from '@/hooks/useAuthEntrance';
import { homeFor } from '@/routes/homeFor';

const SEEN_KEY = 'raahi.locationAsked';

/**
 * Asking for location, once, with a reason.
 *
 * NOT ON THE LOGIN SCREEN, which is where a permission prompt does the most
 * damage: it arrives before anybody has said what the app is for, and a browser
 * only ever asks once — a "block" tapped there cannot be re-prompted from
 * script and follows the person around until they dig into site settings. So it
 * is asked after sign-in, on a screen whose whole job is to say why.
 *
 * SKIPPABLE, because it has to be. The customer home handles having no position
 * — it always has — and a wall between somebody and the app for a permission
 * they may have good reasons to withhold is not a permission request, it is a
 * demand. Skipping is recorded so nobody is asked twice.
 *
 * Three outcomes, three different screens. "Denied" and "not asked yet" look
 * identical to a naive implementation and need opposite words: one needs a
 * button, the other needs instructions for undoing a block that script cannot
 * undo.
 */
export default function LocationPermission() {
  const { role, user, rider } = useAuth();
  const navigate = useNavigate();
  const scope = useAuthEntrance();
  const { status, request, isDenied, isInsecure, canPrompt, supported } = useGeolocation();

  const [asking, setAsking] = useState(false);

  const leave = () => {
    remember();
    navigate(homeFor(role, user, rider), { replace: true });
  };

  // Granted while this screen is open: the job is done, so get out of the way.
  useEffect(() => {
    if (status === 'granted') {
      remember();
      navigate(homeFor(role, user, rider), { replace: true });
    }
  }, [status, navigate, role, user, rider]);

  async function ask() {
    setAsking(true);
    try {
      await request();
    } finally {
      setAsking(false);
    }
  }

  const blocked = isDenied || isInsecure || !supported;

  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <div ref={scope} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 px-6 py-10">
        <div className="flex flex-col items-center gap-4 text-center" data-auth="heading">
          <span className="grid size-14 place-items-center rounded-2xl bg-[var(--accent-wash)]">
            {blocked ? (
              <ShieldAlert className="size-6 text-[var(--accent)]" aria-hidden />
            ) : (
              <MapPin className="size-6 text-[var(--accent)]" aria-hidden />
            )}
          </span>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-body">
              {blocked ? 'Location is switched off' : 'Turn on location'}
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              {blocked
                ? isInsecure
                  ? 'This page is not on a secure connection, so your browser will not share location. Open Raahi over HTTPS to use it.'
                  : !supported
                    ? 'This browser cannot share a location. You can still use Raahi by typing your pickup point.'
                    : 'Your browser is blocking location for Raahi. You can turn it back on in your browser’s site settings for this page — it cannot be re-asked from here.'
                : 'Raahi uses your location to find pickup points, show nearby riders and track your trip while it runs. It is only used while you are using the app.'}
            </p>
          </div>
        </div>

        <div className="space-y-3" data-auth="submit">
          {canPrompt && !blocked && (
            <Button size="lg" block loading={asking} onClick={ask}>
              {asking ? 'Waiting for your browser' : 'Allow location'}
            </Button>
          )}

          <Button variant={blocked ? 'primary' : 'ghost'} size="lg" block onClick={leave}>
            {blocked ? 'Continue without it' : 'Not now'}
          </Button>
        </div>

        <p className="text-center text-[12px] leading-relaxed text-faint" data-auth="footer">
          You can change this at any time in your browser settings.
        </p>
      </div>
    </div>
  );
}

/**
 * Remembers that we asked, so this screen appears once.
 *
 * Deliberately local rather than a server setting: it is about this browser's
 * permission state, which does not travel with the account. A denial on a
 * laptop says nothing about a phone.
 */
function remember() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Blocked storage: the worst case is being asked again next time, which is
    // a great deal better than failing to sign in.
  }
}

export function locationAlreadyAsked() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}
