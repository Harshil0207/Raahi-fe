import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, PasswordInput } from '@/components/ui/input';
import { PasswordStrength } from '@/components/auth/AuthBits';
import { useAuthEntrance } from '@/hooks/useAuthEntrance';
import { passwordProblem } from '@/validators/auth.validator';
import * as authApi from '@/services/auth.api';

/**
 * Setting a new password from an emailed link.
 *
 * The token lives in the URL and goes nowhere else — not into storage, not into
 * the auth state. It is spent by this one request and the server marks it used,
 * so a link that somebody forwards or that stays in a browser history is worth
 * nothing after the first redemption.
 *
 * Every other session is dropped server-side when this succeeds. Somebody
 * resetting their password is often somebody who thinks their account has been
 * taken, and a reset that leaves the intruder signed in is theatre.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const scope = useAuthEntrance();

  const token = params.get('token');

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // No token means this was not reached from a link. Nothing to do here.
  if (!token) return <Navigate to="/forgot-password" replace />;

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const found = {};
    const weak = passwordProblem(values.password);
    if (weak) found.password = weak;
    if (values.confirmPassword !== values.password) found.confirmPassword = 'These do not match';

    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await authApi.resetPassword({ token, password: values.password });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={scope} className="space-y-7">
      <header className="space-y-1.5" data-auth="heading">
        <h1 className="text-2xl font-semibold tracking-tight text-body">Set a new password</h1>
        <p className="text-sm text-muted">You&apos;ll be signed out everywhere else.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div data-auth="field">
          <Field label="New password" error={errors.password}>
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
          <PasswordStrength value={values.password} className="mt-2" />
        </div>

        <div data-auth="field">
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
        </div>

        <Button type="submit" size="lg" block loading={saving} data-auth="submit">
          {saving ? 'Updating' : 'Update password'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted" data-auth="footer">
        <Link to="/login" className="font-medium text-[var(--accent)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
