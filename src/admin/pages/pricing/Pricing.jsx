import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { ConfirmDialog } from '@/admin/components/common/Dialog';
import { ServiceIcon } from '@/admin/components/common/ServiceIcon';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Card, ErrorState, Skeleton, Switch } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import * as pricingApi from '@/admin/services/pricing.api';
import { PERMISSIONS } from '@/admin/constants/permissions';
import { formatMoney } from '@/admin/utils/format';
import { cn } from '@/lib/utils';

/**
 * What each service costs, and whether it is offered at all.
 *
 * One card per service rather than a list of settings rows: an operator thinks
 * "what does a bike cost", not "what is services.BIKE.ratePerKm". Underneath it
 * is the same settings store, so a change here validates, invalidates the cache
 * and lands in the audit log exactly as any other setting does.
 *
 * A price change is confirmed before it is saved, and the dialog says what the
 * rate is moving from and to — the operator confirms the change, not the click.
 * Rides already booked keep the rate they were quoted at, which the screen says
 * out loud because it is the question this page raises.
 */
export default function Pricing() {
  const { can } = useAuth();
  const editable = can(PERMISSIONS.SETTINGS_UPDATE);

  const { data, loading, error, refetch } = useAsync(useCallback(() => pricingApi.all(), []), []);

  const [drafts, setDrafts] = useState({});
  const [fields, setFields] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [saving, setSaving] = useState(null);

  const services = data?.services || [];
  const currency = data?.currency || 'INR';

  const passenger = services.filter((s) => s.bookingType === 'RIDE');
  const parcel = services.filter((s) => s.bookingType === 'PARCEL');

  const draftFor = (service) => ({
    ratePerKm: service.ratePerKm,
    minimumFare: service.minimumFare,
    maximumFare: service.maximumFare,
    ...(drafts[service.serviceType] || {})
  });

  const setDraft = (serviceType, patch) =>
    setDrafts((current) => ({ ...current, [serviceType]: { ...current[serviceType], ...patch } }));

  const changedFields = (service) => {
    const draft = draftFor(service);
    return ['ratePerKm', 'minimumFare', 'maximumFare'].filter(
      (field) => Number(draft[field]) !== Number(service[field])
    );
  };

  async function apply(serviceType, patch) {
    setSaving(serviceType);
    setFields((current) => ({ ...current, [serviceType]: {} }));

    try {
      const result = await pricingApi.update(serviceType, patch);
      setDrafts((current) => {
        const next = { ...current };
        delete next[serviceType];
        return next;
      });

      await refetch();
      toast.success(result.changes?.length ? 'Pricing updated' : 'Nothing to change');
    } catch (err) {
      if (Object.keys(err.fields || {}).length) {
        // The backend names the settings key; the form knows the short field.
        const mapped = {};
        for (const [key, message] of Object.entries(err.fields)) {
          mapped[key.split('.').pop()] = message;
        }
        setFields((current) => ({ ...current, [serviceType]: mapped }));
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(null);
    }
  }

  /** The switch saves on its own: there is nothing to review about on or off. */
  async function toggle(service, enabled) {
    await apply(service.serviceType, { enabled });
  }

  function requestSave(service) {
    const changed = changedFields(service);
    if (!changed.length) return;

    const draft = draftFor(service);
    setConfirming({
      service,
      patch: Object.fromEntries(changed.map((field) => [field, Number(draft[field])])),
      changed: changed.map((field) => ({
        field,
        label: FIELD_LABEL[field],
        from: service[field],
        to: Number(draft[field])
      }))
    });
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Pricing & services" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-[var(--radius-card)]" />
          ))}
        </div>
      </>
    );
  }

  if (error) return <ErrorState description={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Pricing & services"
        description="What each service costs per kilometre, and whether customers are offered it."
      />

      {!editable && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-card)] border border-hair bg-sunken px-3.5 py-2.5 text-[13px] text-muted">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          You can read pricing but not change it.
        </div>
      )}

      <p className="mb-4 text-[13px] text-muted">
        A change applies to the next booking. A ride already booked keeps the rate it was quoted at, so nothing you
        do here reprices a trip already taken.
      </p>

      <Section title="Passenger rides" services={passenger}>
        {passenger.map((service) => (
          <ServiceCard
            key={service.serviceType}
            service={service}
            currency={currency}
            draft={draftFor(service)}
            changed={changedFields(service)}
            fieldErrors={fields[service.serviceType] || {}}
            editable={editable}
            saving={saving === service.serviceType}
            onChange={(patch) => setDraft(service.serviceType, patch)}
            onSave={() => requestSave(service)}
            onToggle={(enabled) => toggle(service, enabled)}
          />
        ))}
      </Section>

      <Section title="Parcel delivery" services={parcel}>
        {parcel.map((service) => (
          <ServiceCard
            key={service.serviceType}
            service={service}
            currency={currency}
            draft={draftFor(service)}
            changed={changedFields(service)}
            fieldErrors={fields[service.serviceType] || {}}
            editable={editable}
            saving={saving === service.serviceType}
            onChange={(patch) => setDraft(service.serviceType, patch)}
            onSave={() => requestSave(service)}
            onToggle={(enabled) => toggle(service, enabled)}
          />
        ))}
      </Section>

      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? `Change ${confirming.service.label} pricing?` : ''}
        confirmLabel="Apply"
        description={
          confirming && (
            <div className="space-y-3">
              <ul className="space-y-1.5">
                {confirming.changed.map((change) => (
                  <li key={change.field} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-muted">{change.label}</span>
                    <span className="tabular shrink-0 text-body">
                      {formatMoney(change.from, currency)}
                      <span className="mx-1.5 text-faint">→</span>
                      <span className="font-semibold">{formatMoney(change.to, currency)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[12.5px] text-muted">
                Applies to the next {confirming.service.bookingType === 'PARCEL' ? 'delivery' : 'ride'} booked. Trips
                already taken keep their own rate.
              </p>
            </div>
          )
        }
        onConfirm={async () => {
          await apply(confirming.service.serviceType, confirming.patch);
          setConfirming(null);
        }}
      />
    </>
  );
}

const FIELD_LABEL = {
  ratePerKm: 'Price per kilometre',
  minimumFare: 'Minimum fare',
  maximumFare: 'Maximum fare'
};

function Section({ title, services, children }) {
  if (!services.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2.5 text-[13px] font-semibold text-body">{title}</h2>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function ServiceCard({
  service,
  currency,
  draft,
  changed,
  fieldErrors,
  editable,
  saving,
  onChange,
  onSave,
  onToggle
}) {
  const free = Number(draft.ratePerKm) === 0;

  return (
    <Card className={cn('p-4', !service.enabled && 'opacity-70')}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-body">
          <ServiceIcon serviceType={service.serviceType} className="size-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-body">{service.label}</p>
          <p className="text-[12.5px] text-muted">{service.description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[12px] text-muted">{service.enabled ? 'Offered' : 'Hidden'}</span>
          <Switch
            checked={service.enabled}
            onCheckedChange={onToggle}
            disabled={!editable || saving}
            aria-label={`${service.label} available to customers`}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Money
          label="Per km"
          value={draft.ratePerKm}
          error={fieldErrors.ratePerKm}
          disabled={!editable || saving}
          min={service.limits.ratePerKm.min}
          max={service.limits.ratePerKm.max}
          onChange={(ratePerKm) => onChange({ ratePerKm })}
        />
        <Money
          label="Minimum"
          value={draft.minimumFare}
          error={fieldErrors.minimumFare}
          disabled={!editable || saving}
          hint="0 = none"
          onChange={(minimumFare) => onChange({ minimumFare })}
        />
        <Money
          label="Maximum"
          value={draft.maximumFare}
          error={fieldErrors.maximumFare}
          disabled={!editable || saving}
          hint="0 = none"
          onChange={(maximumFare) => onChange({ maximumFare })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted">
          {free ? (
            // Zero is a decision, so it is stated rather than shown as "₹0".
            <span className="font-medium text-body">Free at the point of use</span>
          ) : (
            <>
              10 km costs{' '}
              <span className="tabular font-medium text-body">
                {formatMoney(Number(draft.ratePerKm) * 10, currency)}
              </span>
            </>
          )}
        </p>

        {editable && (
          <Button size="sm" disabled={!changed.length} loading={saving} onClick={onSave}>
            {changed.length ? `Save ${changed.length === 1 ? 'change' : `${changed.length} changes`}` : 'Saved'}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Money({ label, value, onChange, error, disabled, hint, min = 0, max }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-muted">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        min={min}
        max={max}
        step="0.5"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={cn('tabular', error && 'border-[var(--danger)]')}
      />
      {error ? (
        <span className="mt-1 block text-[11.5px] text-[var(--danger)]">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-[11.5px] text-faint">{hint}</span>
      )}
    </label>
  );
}
