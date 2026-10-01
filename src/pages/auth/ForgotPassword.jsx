import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuthEntrance } from '@/hooks/useAuthEntrance';
import * as authApi from '@/services/auth.api';

/**
 * Asking for a way back in.
 *
 * THE ANSWER IS THE SAME EITHER WAY, and that is the feature. "No account with
 * that email" would let anyone discover who is on Raahi by trying addresses —
 * for a ride-hailing app, a list of people and the phone numbers attached to
 * them. So the screen says what it will do and never says what it found, and
 * the server behaves the same way.
 *
 * It also cannot fail visibly for a real address and succeed for a fake one, so
 * an error here is only ever the request itself not arriving.
 */
export default function ForgotPassword() {
  const scope = useAuthEntrance();

  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await authApi.forgotPassword(trimmed);
      setDone(true);
    } catch (err) {
      setError(err?.message || 'That could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div ref={scope} className="space-y-6">
        <div
          className="flex items-start gap-3 rounded-2xl border border-[var(--success-edge)] bg-[var(--success-wash)] p-4"
          data-auth="heading"
        >
          <MailCheck className="mt-0.5 size-5 shrink-0 text-[var(--success)]" aria-hidden />
          <div>
            <p className="font-semibold text-body">Check your inbox</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              If an account exists for that address, we&apos;ve sent recovery instructions. The link works once and
              expires in 30 minutes.
            </p>
          </div>
        </div>

        <Link to="/login" className="block" data-auth="footer">
          <Button variant="outline" size="lg" block>
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={scope} className="space-y-7">
      <header className="space-y-1.5" data-auth="heading">
        <h1 className="text-2xl font-semibold tracking-tight text-body">Forgot password</h1>
        <p className="text-sm text-muted">
          Enter the email on your account and we&apos;ll send you a link to set a new password.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div data-auth="field">
          <Field label="Email" error={error}>
            {(props) => (
              <Input
                {...props}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
              />
            )}
          </Field>
        </div>

        <Button type="submit" size="lg" block loading={sending} data-auth="submit">
          {sending ? 'Sending' : 'Send recovery link'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted" data-auth="footer">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
