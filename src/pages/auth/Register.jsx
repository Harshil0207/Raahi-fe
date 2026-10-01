import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, PasswordInput } from '@/components/ui/input';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { AuthDivider, PasswordStrength } from '@/components/auth/AuthBits';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { useAuthEntrance } from '@/hooks/useAuthEntrance';
import { hasErrors, validateRegister } from '@/validators/auth.validator';
import { afterAuth } from '@/routes/homeFor';
import { ROLES, VEHICLE_TYPES } from '@/constants/ride';
import { cn } from '@/lib/utils';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: ROLES.CUSTOMER,
  vehicle: { type: 'bike', make: '', model: '', numberPlate: '', color: '' },
  licence: { number: '' }
};

export default function Register() {
  const { register, applyGoogleSession } = useAuth();
  const navigate = useNavigate();
  const scope = useAuthEntrance();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isRider = values.role === ROLES.RIDER;

  const land = useCallback((session) => navigate(afterAuth(session), { replace: true }), [navigate]);

  /**
   * The role chosen above travels with the Google sign-in.
   *
   * It only matters for an account that does not exist yet — a returning user
   * keeps whatever role they already have, decided server-side. Somebody
   * picking "drive" here and signing in with an existing customer account signs
   * into that customer account, which is the correct and least surprising
   * outcome.
   */
  const google = useGoogleSignIn({
    // The session is applied before navigating; a guard on the destination
    // reads auth state, and state that has not been set yet reads as signed out.
    onSession: async (session) => {
      await applyGoogleSession(session);
      land(session);
    },
    role: values.role
  });

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const setNested = (group, key) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [group]: { ...v[group], [key]: value } }));
    setErrors((prev) => ({ ...prev, [`${group}.${key}`]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const found = validateRegister(values);
    setErrors(found);
    if (hasErrors(found)) return;

    // Customers must not send vehicle/licence — the backend rejects the shape.
    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      password: values.password,
      role: values.role,
      ...(isRider
        ? {
            vehicle: {
              type: values.vehicle.type,
              numberPlate: values.vehicle.numberPlate.trim().toUpperCase(),
              ...(values.vehicle.make.trim() ? { make: values.vehicle.make.trim() } : {}),
              ...(values.vehicle.model.trim() ? { model: values.vehicle.model.trim() } : {}),
              ...(values.vehicle.color.trim() ? { color: values.vehicle.color.trim() } : {})
            },
            licence: { number: values.licence.number.trim().toUpperCase() }
          }
        : {})
    };

    setSubmitting(true);
    try {
      const session = await register(payload);
      toast.success(isRider ? 'Rider account created' : 'Account created');
      land(session);
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={scope} className="space-y-7">
      <header className="space-y-1.5" data-auth="heading">
        <h1 className="text-2xl font-semibold tracking-tight text-body">Create account</h1>
        <p className="text-sm text-muted">Book rides, or earn by driving.</p>
      </header>

      <div data-auth="field">
        <RoleToggle
        value={values.role}
        onChange={(role) => {
          setValues((v) => ({ ...v, role }));
          setErrors({});
        }}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name}>
          {(props) => (
            <Input {...props} autoComplete="name" placeholder="Asha Patel" value={values.name} onChange={set('name')} />
          )}
        </Field>

        <Field label="Email" error={errors.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={set('email')}
            />
          )}
        </Field>

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

        <Field label="Password" error={errors.password}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              placeholder="Create a password"
              value={values.password}
              onChange={set('password')}
            />
          )}
        </Field>

        {/* The same five rules the server enforces, said before the round trip. */}
        <PasswordStrength value={values.password} className="-mt-1" />

        <Field label="Confirm password" error={errors.confirmPassword}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              placeholder="Type it again"
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
            />
          )}
        </Field>

        {isRider && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 overflow-hidden rounded-2xl border border-hair bg-sunken p-4"
          >
            <p className="text-sm font-medium text-body">Vehicle & licence</p>

            <Field label="Vehicle type" error={errors['vehicle.type']}>
              {({ id }) => (
                <div id={id} className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
                  {VEHICLE_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={values.vehicle.type === option.value}
                      onClick={() => setValues((v) => ({ ...v, vehicle: { ...v.vehicle, type: option.value } }))}
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

            <div className="grid grid-cols-2 gap-3">
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
          </motion.div>
        )}

        <Button
          type="submit"
          size="lg"
          block
          loading={submitting}
          disabled={submitting || google.busy}
          className="mt-2"
          data-auth="submit"
        >
          {submitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      {!google.checking && google.clientId && (
        <div className="space-y-4" data-auth="google">
          <AuthDivider label="or" />

          {google.busy ? (
            <p className="rounded-full border border-hair bg-sunken px-4 py-3 text-center text-sm text-muted">
              Signing in with Google…
            </p>
          ) : (
            <GoogleButton
              clientId={google.clientId}
              onCredential={google.signIn}
              onError={google.fail}
              disabled={submitting || google.busy}
              label="signup_with"
            />
          )}

          {/* A rider signing up with Google still supplies a vehicle and still
              waits for approval; Google proves who they are and nothing more. */}
          {isRider && (
            <p className="text-center text-[12.5px] text-muted">
              You&apos;ll add your vehicle and licence next, then wait for approval.
            </p>
          )}

          {google.error && (
            <p role="alert" className="text-center text-[13px] text-[var(--danger)]">
              {google.error}
            </p>
          )}
        </div>
      )}

      <p className="text-center text-sm text-muted" data-auth="footer">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[var(--accent)] hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}

function RoleToggle({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-sunken p-1" role="radiogroup" aria-label="Account type">
      {[
        { key: ROLES.CUSTOMER, label: 'I need rides' },
        { key: ROLES.RIDER, label: 'I want to drive' }
      ].map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            'relative h-11 rounded-xl text-sm font-medium transition-colors',
            value === option.key ? 'text-[var(--accent-contrast)]' : 'text-muted'
          )}
        >
          {value === option.key && (
            <motion.span
              layoutId="role-pill"
              className="absolute inset-0 rounded-xl bg-[var(--accent)]"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
