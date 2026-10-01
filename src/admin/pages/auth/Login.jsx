import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '@/admin/components/ui/button';
import { Field, Input } from '@/admin/components/ui/input';
import { useAuth } from '@/admin/hooks/useAuth';
import { useMaintenanceFlag } from '@/admin/hooks/useMaintenanceFlag';

/**
 * Admin sign-in.
 *
 * Nothing here hints at whether an email exists — the backend returns one
 * message for a wrong address and a wrong password, and this shows it verbatim
 * rather than guessing which field was at fault.
 */
export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const maintenance = useMaintenanceFlag();

  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    setFields({});

    try {
      await signIn({ email: values.email.trim().toLowerCase(), password: values.password });
      // Back to wherever the guard interrupted them.
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else setError(err.message);
      setBusy(false);
    }
  }

  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="grid min-h-dvh place-items-center bg-app p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]">
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path
                d="M4 14.5c3.2.4 6-1 7.6-3.4 1-1.6 1.3-3.4 1-5.3-1.7 1.2-3 2-4.6 2.5-2 .7-3.2 2.4-4 6.2z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-[16px] font-semibold leading-tight text-body">Raahi Operations</h1>
            <p className="text-[12.5px] text-muted">Sign in to the console</p>
          </div>
        </div>

        {maintenance && (
          <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--warning-wash)] bg-[var(--warning-wash)] p-3 text-[12.5px] text-body">
            The platform is in maintenance mode. Customers and riders cannot book; the console still works.
          </div>
        )}

        <form
          onSubmit={submit}
          className="space-y-4 rounded-[var(--radius-card)] border border-hair bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <Field label="Email" error={fields.email}>
            {(props) => (
              <Input
                {...props}
                type="email"
                autoComplete="username"
                autoFocus
                value={values.email}
                onChange={set('email')}
                placeholder="you@example.com"
              />
            )}
          </Field>

          <Field label="Password" error={fields.password}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={set('password')}
                placeholder="••••••••••"
              />
            )}
          </Field>

          {error && (
            <p role="alert" className="text-[12.5px] text-[var(--danger)]">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" block loading={busy}>
            <LogIn aria-hidden />
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-[12px] text-faint">
          Admin accounts are created from the server with{' '}
          <span className="mono">npm run admin:create</span>, then managed here by a super admin.
        </p>
      </div>
    </div>
  );
}
