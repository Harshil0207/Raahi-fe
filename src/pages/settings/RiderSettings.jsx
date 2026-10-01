import { useMemo } from 'react';
import {
  Accessibility,
  Bell,
  BadgeCheck,
  Bike,
  LifeBuoy,
  Navigation,
  Palette,
  Power,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout, SettingsSkeleton } from '@/components/settings/SettingsLayout';
import { SettingsGroup, ProfileCard, useSettingsSaver } from '@/components/settings/SettingsGroup';
import { SettingsLink, SettingsNote, SettingsSection, SettingsStatic } from '@/components/settings/SettingsPrimitives';
import { ErrorState } from '@/components/ui/misc';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';

/**
 * A rider's own settings.
 *
 * Same machinery as the customer screen; a different set of groups, because the
 * server sends a rider a different set. Two things here are rider-specific and
 * worth stating:
 *
 * THE PROFILE FIGURES ARE READ-ONLY. Rating, completed trips, acceptance and
 * cancellation rates are shown and cannot be edited — they are counted on the
 * server from what actually happened, and a screen that offered to change them
 * would be offering to falsify them.
 *
 * NOTHING HERE AFFECTS ELIGIBILITY. "Go offline when idle" is a convenience.
 * Whether a rider may be online at all is decided by the server from their
 * wallet balance against the platform's threshold, and no switch on this screen
 * can reach that — which is why the wallet section links out rather than
 * offering to configure anything.
 */
export function RiderSettings() {
  const { user, rider } = useAuth();
  const navigate = useNavigate();
  const { groups, mandatoryNotifications, loaded, error, reload } = useUserSettings();
  const { save, saving } = useSettingsSaver();

  const sections = useMemo(() => {
    const group = (id) => groups.find((g) => g.group === id);

    return [
      {
        id: 'profile',
        title: 'Rider profile',
        summary: 'Your record',
        icon: BadgeCheck,
        content: (
          <>
            <SettingsSection title="Your record">
              <SettingsStatic
                title="Rating"
                description="The average of what customers scored you."
                value={rider?.rating != null ? `${rider.rating.toFixed(2)} ★` : 'Not rated yet'}
              />
              <SettingsStatic title="Trips completed" value={String(rider?.totalRides ?? 0)} />
              <SettingsStatic
                title="Acceptance rate"
                description="How often you take the requests you are offered."
                value={rateOf(rider?.offersAccepted, rider?.offersReceived)}
              />
              <SettingsStatic
                title="Cancellation rate"
                description="How often you call off a trip you accepted."
                value={rateOf(rider?.ridesCancelled, rider?.offersAccepted)}
              />
            </SettingsSection>
            <SettingsNote>
              These are counted from your trips and cannot be edited. They affect how often you are
              offered work, alongside how close you are to the pickup.
            </SettingsNote>

            <SettingsSection title="Vehicle">
              <SettingsStatic
                icon={Bike}
                title={vehicleName(rider?.vehicle)}
                description="Change your vehicle details on your profile."
                value={rider?.vehicle?.numberPlate}
              />
              <SettingsLink
                title="Edit vehicle and licence"
                description="Number plate, make, model and colour."
                onClick={() => navigate('/rider/profile')}
              />
            </SettingsSection>
          </>
        )
      },
      {
        id: 'riding',
        title: 'Riding',
        summary: 'Request alerts and units',
        icon: Bike,
        content: (
          <>
            <SettingsGroup group={group('riding')} onSave={save} saving={saving} />
            <SettingsNote>
              With the sound off, a new request still appears on screen — it just arrives quietly.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'navigation',
        title: 'Navigation',
        summary: 'Map behaviour',
        icon: Navigation,
        content: <SettingsGroup group={group('navigation')} onSave={save} saving={saving} />
      },
      {
        id: 'availability',
        title: 'Availability',
        summary: 'Going online and offline',
        icon: Power,
        content: (
          <>
            <SettingsGroup group={group('availability')} onSave={save} saving={saving} />
            <SettingsNote>
              Whether you can go online at all depends on your wallet balance against Raahi’s limit.
              Nothing on this screen changes that.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'notifications',
        title: 'Notifications',
        summary: 'Trip, payment and support alerts',
        icon: Bell,
        content: (
          <>
            <SettingsGroup group={group('notifications')} onSave={save} saving={saving} />
            {mandatoryNotifications.map((item) => (
              <SettingsSection key={item.label} title="Always on">
                <div className="px-4 py-3">
                  <p className="text-[15px] text-body">{item.label}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted">{item.description}</p>
                </div>
              </SettingsSection>
            ))}
            <SettingsNote>
              Raahi shows alerts inside the app. It does not send email, SMS or phone notifications.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'earnings',
        title: 'Earnings and wallet',
        summary: 'Balance, recharge, history',
        icon: Wallet,
        content: (
          <>
            <SettingsSection>
              <SettingsLink
                icon={Wallet}
                title="Wallet"
                description="Balance, what you owe, and recharging."
                onClick={() => navigate('/rider/wallet')}
              />
              <SettingsLink
                title="Earnings"
                description="Daily, weekly and monthly, with commission and waiting charges."
                onClick={() => navigate('/rider/earnings')}
              />
            </SettingsSection>
            <SettingsNote>
              Commission, the balance limit and the minimum recharge are set by Raahi and are the same
              for every rider.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'privacy',
        title: 'Privacy',
        summary: 'What customers can see',
        icon: ShieldCheck,
        content: (
          <>
            <SettingsGroup group={group('privacy')} onSave={save} saving={saving} />
            <SettingsNote>
              Your location is shared while you are online. That is how you are offered work near you
              and how a customer follows you to the pickup, so it cannot be switched off while you are
              online. Going offline stops it.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'appearance',
        title: 'Appearance',
        summary: 'Theme',
        icon: Palette,
        content: <SettingsGroup group={group('appearance')} onSave={save} saving={saving} />
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        summary: 'Motion, text size, contrast',
        icon: Accessibility,
        content: <SettingsGroup group={group('accessibility')} onSave={save} saving={saving} />
      },
      {
        id: 'help',
        title: 'Help and support',
        summary: 'FAQs, contact, report a customer',
        icon: LifeBuoy,
        content: (
          <SettingsSection>
            <SettingsLink
              icon={LifeBuoy}
              title="Help centre"
              description="FAQs and how to reach support."
              onClick={() => navigate('/rider/help')}
            />
            <SettingsLink
              title="Report a customer"
              description="Raise a complaint about a trip."
              onClick={() => navigate('/rider/support/new')}
            />
          </SettingsSection>
        )
      }
    ];
  }, [groups, mandatoryNotifications, rider, save, saving, navigate]);

  if (error && !loaded) {
    return (
      <div className="min-h-dvh bg-app px-4 pt-10">
        <ErrorState
          title="Settings are unavailable"
          description="We could not load your preferences just now."
          onRetry={reload}
        />
      </div>
    );
  }

  if (!loaded) return <SettingsSkeleton title="Settings" back="/rider/profile" />;

  return (
    <SettingsLayout
      title="Settings"
      back="/rider/profile"
      sections={sections}
      profile={<ProfileCard user={user} to="/rider/profile" />}
    />
  );
}

/**
 * A rate, or an honest blank.
 *
 * "0%" and "no data yet" are different things, and showing the first for the
 * second tells a new rider they have a perfect cancellation record or a terrible
 * acceptance one, depending which row they are reading.
 */
function rateOf(part, whole) {
  if (!whole) return 'Not enough trips yet';
  return `${Math.round((Number(part || 0) / whole) * 100)}%`;
}

function vehicleName(vehicle) {
  if (!vehicle) return 'No vehicle on file';
  const words = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return words || `Your ${vehicle.type}`;
}

export default RiderSettings;
