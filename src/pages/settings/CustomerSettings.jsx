import { useMemo } from 'react';
import {
  Accessibility,
  Bell,
  CarFront,
  CircleUserRound,
  LifeBuoy,
  MapPin,
  Palette,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout, SettingsSkeleton } from '@/components/settings/SettingsLayout';
import { SettingsGroup, ProfileCard, useSettingsSaver } from '@/components/settings/SettingsGroup';
import { SettingsLink, SettingsNote, SettingsSection } from '@/components/settings/SettingsPrimitives';
import { ErrorState } from '@/components/ui/misc';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';

/**
 * A customer's own settings.
 *
 * The rows are built from what the server sends, not from a list typed out
 * here: labels, descriptions and the choices a select offers all come down with
 * the values. So a setting added to the backend registry appears here with no
 * edit, and — more to the point — a select can never offer a choice the server
 * would reject.
 *
 * What this screen does NOT have, and why:
 *
 *   No Language section. Raahi has no translations; a picker would change a
 *   stored value and nothing else.
 *
 *   No Push or Email notification switches. Nothing can deliver them — see the
 *   note in the backend registry.
 *
 *   No Security section yet: there is no change-password endpoint, no session
 *   list and no 2FA to configure. Sign out lives on the profile screen where it
 *   always has, rather than being moved somewhere new so this screen looks
 *   fuller.
 *
 * Each of those is a deliberate absence rather than an oversight, which is why
 * the ones a reader would go looking for are said out loud on the screen.
 */
export function CustomerSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groups, mandatoryNotifications, loaded, error, reload } = useUserSettings();
  const { save, saving } = useSettingsSaver();

  const sections = useMemo(() => {
    const group = (id) => groups.find((g) => g.group === id);

    return [
      {
        id: 'ride',
        title: 'Ride preferences',
        summary: 'Default vehicle, fare breakdown, map',
        icon: CarFront,
        content: (
          <>
            <SettingsGroup group={group('ride')} onSave={save} saving={saving} />
            <SettingsNote>
              Prices are set by Raahi and are the same whatever you choose here.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'notifications',
        title: 'Notifications',
        summary: 'Ride, payment and message alerts',
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
              Raahi shows alerts inside the app. It does not send email, SMS or phone notifications, so
              there is nothing here to switch those off.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'privacy',
        title: 'Privacy',
        summary: 'What the other person on a trip can see',
        icon: ShieldCheck,
        content: (
          <>
            <SettingsGroup group={group('privacy')} onSave={save} saving={saving} />
            <SettingsNote>
              Your location is used while a ride is running so your rider can find you and you can
              follow the trip. That part cannot be switched off while you have a ride booked — it is
              how the ride works. It stops when the trip ends.
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
        content: (
          <>
            <SettingsGroup group={group('accessibility')} onSave={save} saving={saving} />
            <SettingsNote>
              Reduce motion follows your phone’s own accessibility setting unless you choose
              otherwise here.
            </SettingsNote>
          </>
        )
      },
      {
        id: 'places',
        title: 'Saved places',
        summary: 'Home, work and favourites',
        icon: MapPin,
        content: (
          <SettingsSection>
            <SettingsLink
              icon={MapPin}
              title="Saved places"
              description="Add, rename or remove the places you book to most."
              onClick={() => navigate('/saved-places')}
            />
          </SettingsSection>
        )
      },
      {
        id: 'help',
        title: 'Help and support',
        summary: 'FAQs, contact, report a ride',
        icon: LifeBuoy,
        content: (
          <SettingsSection>
            <SettingsLink
              icon={LifeBuoy}
              title="Help centre"
              description="FAQs and how to reach support."
              onClick={() => navigate('/help')}
            />
            <SettingsLink
              icon={CircleUserRound}
              title="Report a ride"
              description="Raise a complaint about a trip."
              onClick={() => navigate('/support/new')}
            />
          </SettingsSection>
        )
      }
    ];
  }, [groups, mandatoryNotifications, save, saving, navigate]);

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

  if (!loaded) return <SettingsSkeleton title="Settings" back="/profile" />;

  return (
    <SettingsLayout
      title="Settings"
      back="/profile"
      sections={sections}
      profile={<ProfileCard user={user} to="/profile" />}
    />
  );
}

export default CustomerSettings;
