import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useAuthEntrance } from '@/hooks/useAuthEntrance';
import * as authApi from '@/services/auth.api';
import { homeFor } from '@/routes/homeFor';

/**
 * The one thing Google cannot supply.
 *
 * Google proves an identity and hands over a name and a verified address. It
 * does not hand over a phone number, and Raahi dispatches rides to phone
 * numbers — a rider has to be able to call the customer standing on the
 * pavement. So a Google sign-up stops here once, and only once.
 *
 * WHAT THIS SCREEN DOES NOT DO is invent one. A generated placeholder would be
 * a number belonging to a real stranger, sitting on somebody's account until a
 * ride goes wrong.
 */
export default function CompleteProfile() {
  const { user, rider, refreshUser } = useAuth();
  const navigate = useNavigate();
  const scope = useAuthEntrance();

  const [values, setValues] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const found = {};
    if (!values.name.trim() || values.name.trim().length < 2) found.name = 'Enter your name';
    if (!/^\+?[0-9]{10,15}$/.test(values.phone.trim())) found.phone = 'Enter a 10 to 15 digit phone number';

    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await authApi.updateProfile({ name: values.name.trim(), phone: values.phone.trim() });
      const session = await refreshUser();
      toast.success('Profile saved');
      navigate(homeFor(session?.user?.role ?? user?.role, session?.user, session?.rider ?? rider), {
        replace: true
      });
    } catch (err) {
      // A phone number already on another account is the one failure worth
      // showing on the field rather than in a toast.
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-app">
      <AppBar title="Almost there" />

      <div ref={scope} className="mx-auto w-full max-w-sm space-y-7 px-4 pt-4">
        <header className="space-y-1.5" data-auth="heading">
          <h1 className="text-xl font-semibold tracking-tight text-body">Add your phone number</h1>
          <p className="text-sm leading-relaxed text-muted">
            Raahi needs a number so your rider can reach you at pickup. It is never shown to anyone outside a trip
            you are on.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div data-auth="field">
            <Field label="Full name" error={errors.name}>
              {(props) => (
                <Input {...props} autoComplete="name" value={values.name} onChange={set('name')} />
              )}
            </Field>
          </div>

          <div data-auth="field">
            <Field label="Phone" error={errors.phone}>
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="9876543210"
                  value={values.phone}
                  onChange={set('phone')}
                />
              )}
            </Field>
          </div>

          <Button type="submit" size="lg" block loading={saving} data-auth="submit">
            {saving ? 'Saving' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
