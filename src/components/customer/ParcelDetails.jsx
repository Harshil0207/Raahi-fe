import { useState } from 'react';
import { Package, Send } from 'lucide-react';
import { BottomSheet, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Who the package is going between, and what it is.
 *
 * Asked once, in a sheet, after the delivery vehicle is chosen — not folded
 * into the booking card, where six extra fields would bury the fare and the
 * button under a form.
 *
 * Deliberately short. A first delivery needs a name and a number at each end
 * and a description of the thing; anything more is a field someone has to fill
 * in at the kerb holding a box.
 */
const SIZES = [
  { value: 'SMALL', label: 'Small', hint: 'Fits in a backpack' },
  { value: 'MEDIUM', label: 'Medium', hint: 'A carton or two' },
  { value: 'LARGE', label: 'Large', hint: 'Needs the footwell' }
];

const EMPTY = {
  senderName: '',
  senderPhone: '',
  receiverName: '',
  receiverPhone: '',
  description: '',
  size: 'SMALL'
};

export function ParcelDetails({ open, onOpenChange, serviceLabel, initial, onSave, sender }) {
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    // The account holder is usually the one sending it, so their details start
    // filled in — and stay editable, because sometimes they are not.
    senderName: sender?.name || '',
    senderPhone: sender?.phone || '',
    ...initial
  }));
  const [touched, setTouched] = useState(false);

  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  const problems = validate(values);
  const ready = Object.keys(problems).length === 0;

  function save() {
    setTouched(true);
    if (!ready) return;

    onSave({
      ...values,
      senderName: values.senderName.trim(),
      senderPhone: values.senderPhone.trim(),
      receiverName: values.receiverName.trim(),
      receiverPhone: values.receiverPhone.trim(),
      description: values.description.trim()
    });
    onOpenChange(false);
  }

  const errorFor = (field) => (touched ? problems[field] : undefined);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} detent="full" label="Package details">
      <SheetHeader
        title="Package details"
        description={`${serviceLabel} — the rider needs to know who to collect from and who to hand it to.`}
      />

      <div className="space-y-5 overflow-y-auto px-4 pb-4">
        <section className="space-y-3">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Collecting from</h3>

          <Field label="Sender name" error={errorFor('senderName')}>
            {(props) => <Input {...props} value={values.senderName} onChange={set('senderName')} autoComplete="name" />}
          </Field>

          <Field label="Sender phone" error={errorFor('senderPhone')}>
            {(props) => (
              <Input
                {...props}
                value={values.senderPhone}
                onChange={set('senderPhone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />
            )}
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">Delivering to</h3>

          <Field label="Receiver name" error={errorFor('receiverName')}>
            {(props) => <Input {...props} value={values.receiverName} onChange={set('receiverName')} />}
          </Field>

          <Field label="Receiver phone" error={errorFor('receiverPhone')} hint="The rider calls this number on arrival.">
            {(props) => (
              <Input {...props} value={values.receiverPhone} onChange={set('receiverPhone')} type="tel" inputMode="tel" />
            )}
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">The package</h3>

          <Field label="What is it?" error={errorFor('description')} hint="So the rider knows what they are carrying.">
            {(props) => (
              <Input {...props} value={values.description} onChange={set('description')} placeholder="Laptop bag" maxLength={300} />
            )}
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-body">Size</legend>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  role="radio"
                  aria-checked={values.size === size.value}
                  onClick={() => setValues((current) => ({ ...current, size: size.value }))}
                  className={cn(
                    'rounded-2xl border px-2 py-3 text-center transition-colors',
                    values.size === size.value
                      ? 'border-[var(--accent)] bg-[var(--accent-wash)]'
                      : 'border-hair hover:bg-[var(--surface-sunken)]'
                  )}
                >
                  <span className="block text-[13.5px] font-medium text-body">{size.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-muted">{size.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      </div>

      <div className="border-t border-hair px-4 py-3 pb-safe">
        <Button size="lg" block onClick={save} disabled={touched && !ready}>
          <Send aria-hidden />
          Save package details
        </Button>
      </div>
    </BottomSheet>
  );
}

/** Mirrors the server's rules, so the sheet catches what the API would refuse. */
function validate(values) {
  const problems = {};
  const name = (v) => v.trim().length >= 2;
  const phone = (v) => /^[0-9+\-\s]{6,20}$/.test(v.trim());

  if (!name(values.senderName)) problems.senderName = 'Enter the sender’s name';
  if (!phone(values.senderPhone)) problems.senderPhone = 'Enter a phone number';
  if (!name(values.receiverName)) problems.receiverName = 'Enter the receiver’s name';
  if (!phone(values.receiverPhone)) problems.receiverPhone = 'Enter a phone number';
  if (values.description.trim().length < 3) problems.description = 'Say what is in the package';

  return problems;
}

/** A one-line summary of saved details, for the booking card. */
export function ParcelSummary({ parcel, onEdit }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3 rounded-2xl bg-sunken px-3.5 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)]">
        <Package className="size-4" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-body">{parcel.description}</span>
        <span className="block truncate text-[12px] text-muted">
          {parcel.senderName} → {parcel.receiverName}
        </span>
      </span>

      <span className="shrink-0 text-[12.5px] font-medium text-accent">Edit</span>
    </button>
  );
}
