import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useAuthEntrance } from '@/hooks/useAuthEntrance';
import * as authApi from '@/services/auth.api';
import { VEHICLE_TYPES } from '@/constants/ride';
import { cn } from '@/lib/utils';

/**
 * What a rider needs beyond an identity.
 *
 * A rider who signed up with Google has an account and nothing to drive: Google
 * verified who they are, which is a different question from whether they hold a
 * licence and own the vehicle they say they do. This is where the second
 * question starts being answered.
 *
 * IT ENDS IN A QUEUE, NOT ON THE ROAD. Submitting this puts the rider in
 * PENDING and the server refuses to let a pending rider go online, so there is
 * no path from "signed in with Google" to "carrying a passenger" that does not
 * pass through a person deciding.
 */
export default function RiderOnboarding() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const scope = useAuthEntrance();

  const [values, setValues] = useState({
    vehicle: { type: 'bike', make: '', model: '', numberPlate: '', color: '' },
    licence: { number: '' }
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setNested = (group, key) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [group]: { ...v[group], [key]: value } }));
    setErrors((prev) => ({ ...prev, [`${group}.${key}`]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const found = {};
    if (!values.vehicle.numberPlate.trim() || values.vehicle.numberPlate.trim().length < 4) {
      found['vehicle.numberPlate'] = 'Number plate is required';
    }
    if (!values.licence.number.trim() || values.licence.number.trim().length < 5) {
      found['licence.number'] = 'Licence number is required';
    }

    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await authApi.riderOnboarding({
        vehicle: {
          type: values.vehicle.type,
          numberPlate: values.vehicle.numberPlate.trim().toUpperCase(),
          ...(values.vehicle.make.trim() ? { make: values.vehicle.make.trim() } : {}),
          ...(values.vehicle.model.trim() ? { model: values.vehicle.model.trim() } : {}),
          ...(values.vehicle.color.trim() ? { color: values.vehicle.color.trim() } : {})
        },
        licence: { number: values.licence.number.trim().toUpperCase() }
      });

      await refreshUser();
      toast.success('Sent for approval');
      navigate('/rider', { replace: true });
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-app">
      <AppBar title="Set up driving" />

      <div ref={scope} className="mx-auto w-full max-w-sm space-y-6 px-4 pt-4 pb-10">
        <header className="space-y-1.5" data-auth="heading">
          <h1 className="text-xl font-semibold tracking-tight text-body">Your vehicle and licence</h1>
          <p className="text-sm leading-relaxed text-muted">
            Raahi checks every rider before they can take trips. Add your details and we&apos;ll review them.
          </p>
        </header>

        <div
          className="flex items-start gap-3 rounded-2xl border border-hair bg-sunken p-3.5"
          data-auth="field"
        >
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-muted">
            Signing in with Google confirms who you are. It does not confirm your licence or your vehicle — that
            part is reviewed by a person, and you&apos;ll be told either way.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div data-auth="field">
            <Field label="Vehicle type">
              {({ id }) => (
                <div id={id} className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
                  {VEHICLE_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={values.vehicle.type === option.value}
                      onClick={() =>
                        setValues((v) => ({ ...v, vehicle: { ...v.vehicle, type: option.value } }))
                      }
                      className={cn(
                        'h-11 rounded-xl border text-sm font-medium transition-colors',
                        values.vehicle.type === option.value
                          ? 'border-[var(--accent)] bg-[var(--accent)]/12 text-[var(--accent)]'
                          : 'border-hair bg-elevated text-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <div data-auth="field">
            <Field label="Number plate" error={errors['vehicle.numberPlate']}>
              {(props) => (
                <Input
                  {...props}
                  placeholder="MH01AB1234"
                  className="uppercase"
                  value={values.vehicle.numberPlate}
                  onChange={setNested('vehicle', 'numberPlate')}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3" data-auth="field">
            <Field label="Make">
              {(props) => (
                <Input {...props} placeholder="Hero" value={values.vehicle.make} onChange={setNested('vehicle', 'make')} />
              )}
            </Field>
            <Field label="Model">
              {(props) => (
                <Input
                  {...props}
                  placeholder="Splendor"
                  value={values.vehicle.model}
                  onChange={setNested('vehicle', 'model')}
                />
              )}
            </Field>
          </div>

          <div data-auth="field">
            <Field label="Licence number" error={errors['licence.number']}>
              {(props) => (
                <Input
                  {...props}
                  placeholder="MH0120230001234"
                  className="uppercase"
                  value={values.licence.number}
                  onChange={setNested('licence', 'number')}
                />
              )}
            </Field>
          </div>

          <Button type="submit" size="lg" block loading={saving} data-auth="submit">
            {saving ? 'Sending' : 'Send for approval'}
          </Button>
        </form>
      </div>
    </div>
  );
}
