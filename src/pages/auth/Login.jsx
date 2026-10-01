import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, PasswordInput } from '@/components/ui/input';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { AuthDivider } from '@/components/auth/AuthBits';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { useAuthEntrance } from '@/hooks/useAuthEntrance';
import { hasErrors, validateLogin } from '@/validators/auth.validator';
import { afterAuth } from '@/routes/homeFor';

export default function Login() {
  const { login, applyGoogleSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const scope = useAuthEntrance();

  /**
   * Where to land, once there is a session.
   *
   * `afterAuth` decides, not this screen: it knows that an account with
   * something left to finish goes to onboarding regardless of where the person
   * was originally headed, and that the remembered destination applies once
   * there is nothing left to finish.
   */
  const land = useCallback(
    (session) => {
      navigate(afterAuth(session, location.state?.from?.pathname), { replace: true });
    },
    [navigate, location.state]
  );

  /**
   * Put the session into the app BEFORE navigating.
   *
   * Navigating first looks like it works and does not: the guard on the
   * destination reads an auth state that has not been told about this session
   * yet, decides nobody is signed in, and bounces straight back to here.
   */
  const google = useGoogleSignIn({
    onSession: async (session) => {
      await applyGoogleSession(session);
      land(session);
    }
  });

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /**
   * Validate on blur, not on every keystroke.
   *
   * "Enter a valid email address" appearing after the first character is the
   * app telling somebody they are wrong while they are still typing.
   */
  const blur = (key) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    const found = validateLogin(values);
    setErrors((prev) => ({ ...prev, [key]: found[key] }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || google.busy) return;

    const found = validateLogin(values);
    setErrors(found);
    setTouched({ email: true, password: true });
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      const session = await login({ email: values.email.trim(), password: values.password });
      land(session);
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || google.busy;

  return (
    <div ref={scope} className="space-y-7">
      <header className="space-y-1.5" data-auth="heading">
        <h1 className="text-2xl font-semibold tracking-tight text-body">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to book a ride or start driving.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div data-auth="field">
          <Field label="Email" error={touched.email ? errors.email : undefined}>
            {(props) => (
              <Input
                {...props}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={set('email')}
                onBlur={blur('email')}
              />
            )}
          </Field>
        </div>

        <div data-auth="field">
          <Field label="Password" error={touched.password ? errors.password : undefined}>
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="current-password"
                placeholder="Your password"
                value={values.password}
                onChange={set('password')}
                onBlur={blur('password')}
              />
            )}
          </Field>
        </div>

        <div className="flex justify-end" data-auth="field">
          <Link
            to="/forgot-password"
            className="text-[13px] font-medium text-muted hover:text-body hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={submitting} disabled={busy} data-auth="submit">
          {submitting ? 'Signing in' : 'Continue'}
        </Button>
      </form>

      {/* Only where Google is actually configured on this server. */}
      {!google.checking && google.clientId && (
        <div className="space-y-4" data-auth="google">
          <AuthDivider />

          {google.busy ? (
            <p className="rounded-full border border-hair bg-sunken px-4 py-3 text-center text-sm text-muted">
              Signing in with Google…
            </p>
          ) : (
            <GoogleButton
              clientId={google.clientId}
              onCredential={google.signIn}
              onError={google.fail}
              disabled={busy}
              label="signin_with"
            />
          )}

          {google.error && (
            <p role="alert" className="text-center text-[13px] text-[var(--danger)]">
              {google.error}
            </p>
          )}
        </div>
      )}

      <p className="text-center text-sm text-muted" data-auth="footer">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-[var(--accent)] hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
