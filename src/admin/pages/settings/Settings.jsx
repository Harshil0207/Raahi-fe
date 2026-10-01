import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { SettingField } from '@/admin/components/settings/SettingField';
import { ConfirmDialog } from '@/admin/components/common/Dialog';
import { Button } from '@/admin/components/ui/button';
import { Select } from '@/admin/components/ui/input';
import { Card, CardHeader, ErrorState, Skeleton } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as settingsApi from '@/admin/services/settings.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import { cn } from '@/lib/utils';

/**
 * Platform configuration.
 *
 * A sidebar of groups on a wide screen, a select on a narrow one — nine tabs
 * across a phone is unusable. One group is edited at a time and saved as a unit,
 * because the backend validates a group together: a minimum fare above the
 * maximum is only wrong as a pair.
 *
 * High-impact changes confirm before saving, and the dialog lists exactly what
 * is about to change so the operator confirms the change rather than the click.
 */
const GROUP_LABEL = {
  fare: 'Fare & pricing',
  finance: 'Commission & balances',
  ride: 'Ride',
  customer: 'Customer',
  rider: 'Rider',
  tracking: 'Live tracking',
  waiting: 'Waiting charges',
  cancellation: 'Cancellations',
  payment: 'Payments',
  chat: 'Chat',
  notification: 'Notifications',
  support: 'Support',
  system: 'General'
};

const GROUP_ORDER = [
  'system',
  'fare',
  // Next to fare, not inside it: fare decides what the customer is charged,
  // finance decides how that charge is split and what happens when a rider
  // falls behind.
  'finance',
  'ride',
  'customer',
  'rider',
  // How close the rider has to be before the customer is told they are nearby,
  // and before the ride marks itself arrived.
  'tracking',
  // What the customer pays for keeping the rider waiting, at the pickup and
  // at the drop-off.
  'waiting',
  // Beside waiting charges: both are what a ride costs when it does not go to
  // plan, and an operator setting one usually wants to see the other.
  'cancellation',
  'payment',
  'chat',
  'notification',
  'support'
];

/**
 * Groups with a screen of their own, deliberately absent from the list above.
 *
 * `services` is every per-service price and switch; the Pricing screen presents
 * those as one card per service, which is how an operator thinks about them. A
 * raw list of 24 rows here as well would be a second, worse editor for the same
 * values.
 */
const GROUPS_EDITED_ELSEWHERE = ['services'];

export default function Settings() {
  const { can } = useAuth();
  const editable = can(PERMISSIONS.SETTINGS_UPDATE);

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => settingsApi.all(), []),
    []
  );

  const [active, setActive] = useState('system');
  const [draft, setDraft] = useState({});
  const [fields, setFields] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * The server's groups, in the order above — and then any it does not know.
   *
   * The trailing part matters: this list used to be the whole filter, so a
   * group added to the backend registry and left out here simply did not
   * appear, and the settings inside it could not be changed by anybody. A
   * missing label is a cosmetic problem; a missing group is an unreachable
   * setting, so unknown groups are shown at the end under their own name.
   */
  const groups = useMemo(() => {
    if (!data?.groups) return [];

    const byName = new Map(data.groups.map((group) => [group.group, group]));
    const known = GROUP_ORDER.map((name) => byName.get(name)).filter(Boolean);

    /**
     * Anything the two lists above do not account for, shown under its raw
     * name at the end.
     *
     * `GROUP_ORDER` used to be the whole filter, which meant a group added to
     * the backend registry and not added here simply did not appear — and
     * every setting in it became unreachable, with nothing to say so. Listing
     * the groups that live on other screens separately keeps that intent
     * explicit and still leaves nowhere for a new group to hide.
     */
    const rest = data.groups.filter(
      (group) => !GROUP_ORDER.includes(group.group) && !GROUPS_EDITED_ELSEWHERE.includes(group.group)
    );

    return [...known, ...rest];
  }, [data]);

  const group = groups.find((candidate) => candidate.group === active) || groups[0];

  // Only the values that actually differ from the server's.
  const changes = useMemo(() => {
    if (!group) return [];
    return group.settings
      .filter((setting) => setting.key in draft)
      .filter((setting) => JSON.stringify(draft[setting.key]) !== JSON.stringify(setting.value))
      .map((setting) => ({ setting, from: setting.value, to: draft[setting.key] }));
  }, [group, draft]);

  const needsConfirmation = changes.some((change) => change.setting.highImpact);

  function valueFor(setting) {
    return setting.key in draft ? draft[setting.key] : setting.value;
  }

  function change(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFields((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function switchGroup(name) {
    // Moving away with unsaved edits would silently lose them.
    if (changes.length && !window.confirm('Discard the unsaved changes in this section?')) return;
    setDraft({});
    setFields({});
    setActive(name);
  }

  async function save() {
    if (!changes.length || busy) return;

    setBusy(true);
    setFields({});

    try {
      const patch = changes.reduce((acc, item) => {
        acc[item.setting.key] = item.to;
        return acc;
      }, {});

      const result = await settingsApi.updateGroup(group.group, patch);

      toast.success(
        result.changes?.length
          ? `Saved ${result.changes.length} change${result.changes.length === 1 ? '' : 's'}`
          : 'No changes to save'
      );

      setDraft({});
      setConfirming(false);
      refetch();
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else toast.error(err.message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Settings" />
        <Skeleton className="h-96 w-full rounded-[var(--radius-card)]" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Settings" />
        <ErrorState description={error.message} onRetry={refetch} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business rules the platform reads at runtime. Changes take effect on the next ride; rides already booked keep the pricing they were quoted."
        actions={
          editable && changes.length > 0 ? (
            <>
              <Button
                onClick={() => {
                  setDraft({});
                  setFields({});
                }}
                disabled={busy}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={() => (needsConfirmation ? setConfirming(true) : save())}
              >
                Save {changes.length} change{changes.length === 1 ? '' : 's'}
              </Button>
            </>
          ) : null
        }
      />

      {!editable && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-hair bg-sunken p-3 text-[12.5px]">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-muted">
            Read-only. Changing a setting needs the <span className="mono">settings.update</span> permission.
          </p>
        </div>
      )}

      <div className="gap-4 lg:grid lg:grid-cols-[13rem_1fr]">
        {/* Narrow: a select. Wide: a rail. */}
        <div className="mb-3 lg:hidden">
          <Select value={active} onChange={(event) => switchGroup(event.target.value)} aria-label="Settings section">
            {groups.map((candidate) => (
              <option key={candidate.group} value={candidate.group}>
                {GROUP_LABEL[candidate.group] || candidate.group}
              </option>
            ))}
          </Select>
        </div>

        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="space-y-0.5">
            {groups.map((candidate) => (
              <li key={candidate.group}>
                <button
                  type="button"
                  onClick={() => switchGroup(candidate.group)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-[var(--radius-field)] px-2.5 py-1.5 text-left text-[13.5px] transition-colors',
                    candidate.group === active
                      ? 'bg-[var(--accent-wash)] font-medium text-accent'
                      : 'text-muted hover:bg-[var(--surface-hover)] hover:text-body'
                  )}
                >
                  {GROUP_LABEL[candidate.group] || candidate.group}
                  <span className="tabular text-[11px] text-faint">{candidate.settings.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {group && (
          <Card className="overflow-hidden">
            <CardHeader
              title={GROUP_LABEL[group.group] || group.group}
              description={`${group.settings.length} setting${group.settings.length === 1 ? '' : 's'}`}
              action={
                changes.length > 0 ? (
                  <span className="text-[12px] text-accent">
                    {changes.length} unsaved change{changes.length === 1 ? '' : 's'}
                  </span>
                ) : null
              }
            />

            <div className="divide-y divide-[var(--border)]">
              {group.settings.map((setting) => (
                <SettingField
                  key={setting.key}
                  setting={setting}
                  value={valueFor(setting)}
                  onChange={(value) => change(setting.key, value)}
                  error={fields[setting.key]}
                  disabled={!editable || busy}
                />
              ))}
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm these changes"
        description={
          <span className="block space-y-2">
            <span className="block">
              These take effect immediately for new rides. Rides already booked keep the pricing they were quoted.
            </span>
            <span className="block space-y-1 rounded-[var(--radius-field)] bg-sunken p-2.5">
              {changes.map((item) => (
                <span key={item.setting.key} className="block text-[12px]">
                  <span className="text-body">{item.setting.label}</span>
                  <span className="mono ml-1.5 text-faint line-through">{display(item.from)}</span>
                  <span className="mx-1 text-faint">→</span>
                  <span className="mono text-body">{display(item.to)}</span>
                </span>
              ))}
            </span>
          </span>
        }
        confirmLabel="Save the changes"
        tone={changes.some((item) => item.setting.key === 'system.maintenanceMode' && item.to) ? 'danger' : 'primary'}
        onConfirm={save}
      />
    </>
  );
}

function display(value) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'empty';
  if (value === '') return 'empty';
  return String(value);
}
