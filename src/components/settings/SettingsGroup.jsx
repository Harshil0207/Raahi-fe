import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SettingsSection, SettingsSegmented, SettingsToggle } from './SettingsPrimitives';
import { useUserSettings } from '@/hooks/useUserSettings';

/**
 * Renders one group of settings from what the server described.
 *
 * Nothing about a particular setting is known here — the type decides the
 * control, the label and description are the server's words, and an enum's
 * choices are the ones the server will accept. That is what keeps a select from
 * offering an option the backend rejects, which is the usual way a settings
 * screen goes subtly wrong.
 */
export function SettingsGroup({ group, onSave, saving, title, description }) {
  if (!group?.settings?.length) return null;

  return (
    <SettingsSection title={title} description={description}>
      {group.settings.map((setting) => (
        <SettingControl
          key={setting.key}
          group={group.group}
          setting={setting}
          onSave={onSave}
          busy={saving.has(setting.key)}
        />
      ))}
    </SettingsSection>
  );
}

function SettingControl({ group, setting, onSave, busy }) {
  const change = (value) => onSave(group, { [setting.key]: value });

  if (setting.type === 'boolean') {
    return (
      <SettingsToggle
        title={setting.label}
        description={setting.description}
        checked={setting.value !== false}
        onChange={change}
        busy={busy}
      />
    );
  }

  if (setting.type === 'enum') {
    return (
      <SettingsSegmented
        title={setting.label}
        description={setting.description}
        value={setting.value}
        options={setting.values.map((value) => ({ value, label: labelFor(value) }))}
        onChange={change}
        busy={busy}
        // A single choice is not a choice. The distance unit is declared as an
        // enum with one value because kilometres are the only unit Raahi uses;
        // showing it as a control somebody can press would suggest otherwise.
        disabled={setting.values.length < 2}
      />
    );
  }

  if (setting.type === 'number') {
    return (
      <NumberSetting setting={setting} onChange={change} busy={busy} />
    );
  }

  // A type the backend added and this does not draw yet. Shown rather than
  // dropped, so it is obvious something is missing instead of a setting
  // quietly not existing.
  return (
    <div className="px-4 py-3">
      <p className="text-[15px] text-body">{setting.label}</p>
      <p className="mt-0.5 text-[13px] text-muted">Not available in this version of the app.</p>
    </div>
  );
}

/**
 * A number, offered as a few sensible choices rather than a text field.
 *
 * The only numeric setting is "go offline after N minutes idle", where typing
 * 137 is not something anybody wants to do on a phone. If a genuinely open
 * number arrives later this should grow a stepper; a free-text field on a
 * settings row is almost never the right control.
 */
function NumberSetting({ setting, onChange, busy }) {
  const choices = [0, 15, 30, 60].filter((n) => n >= (setting.min ?? 0) && n <= (setting.max ?? Infinity));

  return (
    <SettingsSegmented
      title={setting.label}
      description={setting.description}
      value={choices.includes(setting.value) ? setting.value : choices[0]}
      options={choices.map((n) => ({ value: n, label: n === 0 ? 'Never' : `${n} min` }))}
      onChange={onChange}
      busy={busy}
    />
  );
}

/** Enum values are machine words; these are what a person reads. */
const LABELS = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  on: 'On',
  off: 'Off',
  none: 'No default',
  km: 'Kilometres',
  BIKE: 'Bike',
  AUTO: 'Auto',
  CAR: 'Car',
  AMBULANCE: 'Ambulance'
};

const labelFor = (value) => LABELS[value] ?? String(value);

/**
 * Saving, with the per-control busy state the screen needs.
 *
 * A `Set` of the keys in flight rather than one page-wide flag: the brief's
 * rule is that saving must disable the control being saved and not the page,
 * and a single boolean makes that impossible to honour.
 *
 * Failure is reported once, in a toast, and the value has already been put back
 * by the store before this sees it — so the switch on screen and the message
 * always agree.
 */
export function useSettingsSaver() {
  const { update } = useUserSettings();
  const [saving, setSaving] = useState(() => new Set());

  const save = useCallback(
    async (group, patch) => {
      const keys = Object.keys(patch);
      setSaving((current) => new Set([...current, ...keys]));

      const result = await update(group, patch);

      setSaving((current) => {
        const next = new Set(current);
        for (const key of keys) next.delete(key);
        return next;
      });

      if (!result.ok) {
        toast.error(
          // The server's own words when it has them — they name the setting and
          // the reason. Never a raw error.
          result.error?.details?.[0]?.message || result.error?.message || 'That change could not be saved'
        );
      }

      return result;
    },
    [update]
  );

  return { save, saving };
}

/** The person, at the top of their own settings. */
export function ProfileCard({ user, to }) {
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <Link
      to={to}
      className="mb-1 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full bg-sunken text-[15px] font-medium text-body"
        aria-hidden
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-body">{user.name}</span>
        <span className="block truncate text-[13px] text-muted">{user.phone}</span>
      </span>
      <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
