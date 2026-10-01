import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { DetailList, DetailRow } from '@/admin/components/common/DetailRow';
import { Button } from '@/admin/components/ui/button';
import { Field, Input } from '@/admin/components/ui/input';
import { Badge, Card, CardBody, CardHeader } from '@/admin/components/ui/misc';
import { useAuth } from '@/admin/hooks/useAuth';
import * as authApi from '@/admin/services/auth.api';
import { setToken } from '@/admin/services/api';
import { PERMISSION_LABEL, ROLE_LABEL } from '@/admin/constants/permissions';
import { formatDateTime } from '@/admin/utils/format';

/**
 * The signed-in admin's own account.
 *
 * The permission list is here rather than only on the Admins page, because "am
 * I allowed to do this" is a question someone asks about themselves — and it is
 * the real list from the backend, not a guess from the role.
 */
export default function Profile() {
  const { admin, setAdmin } = useAuth();

  return (
    <>
      <PageHeader title="Your profile" description={admin?.email} />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <DetailsCard admin={admin} onSaved={setAdmin} />
          <PasswordCard />
        </div>

        <Card>
          <CardHeader
            title="What you can do"
            description={`${admin?.permissions?.length ?? 0} permissions from your role and any individual grants`}
            action={<Badge tone="accent">{ROLE_LABEL[admin?.role] || admin?.role}</Badge>}
          />
          <ul className="divide-y divide-[var(--border)]">
            {(admin?.permissions || []).map((permission) => (
              <li key={permission} className="flex items-baseline justify-between gap-3 px-4 py-2">
                <span className="text-[13px] text-body">{PERMISSION_LABEL[permission] || permission}</span>
                <span className="mono shrink-0 text-[11px] text-faint">{permission}</span>
              </li>
            ))}
          </ul>
          <CardBody className="border-t border-hair">
            <p className="text-[12px] text-muted">
              A super admin can grant or revoke any of these. Every change to your account is recorded in the
              audit log.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function DetailsCard({ admin, onSaved }) {
  const [name, setName] = useState(admin?.name || '');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  const dirty = name.trim() !== admin?.name;

  async function save() {
    if (!dirty || busy) return;

    setBusy(true);
    setFields({});

    try {
      const updated = await authApi.updateProfile({ name: name.trim() });
      onSaved(updated);
      toast.success('Profile updated');
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Details" />
      <CardBody className="space-y-4">
        <Field label="Name" error={fields.name}>
          {(props) => <Input {...props} value={name} onChange={(event) => setName(event.target.value)} />}
        </Field>

        <DetailList>
          <DetailRow label="Email">{admin?.email}</DetailRow>
          <DetailRow label="Role">{ROLE_LABEL[admin?.role] || admin?.role}</DetailRow>
          <DetailRow label="Last signed in">
            {admin?.lastLoginAt ? formatDateTime(admin.lastLoginAt) : 'This is your first session'}
          </DetailRow>
          <DetailRow label="Account created">{formatDateTime(admin?.createdAt)}</DetailRow>
        </DetailList>

        <Button variant="primary" loading={busy} disabled={!dirty} onClick={save}>
          Save changes
        </Button>
      </CardBody>
    </Card>
  );
}

/**
 * Changing your own password.
 *
 * It ends every other session you had open, which is the point: the usual reason
 * to change a password is that you think someone else might have it. The backend
 * returns a fresh token so this session survives.
 */
function PasswordCard() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const mismatch = values.confirm.length > 0 && values.newPassword !== values.confirm;
  const ready =
    values.currentPassword.length > 0 && values.newPassword.length >= 10 && !mismatch && values.confirm.length > 0;

  async function submit() {
    if (!ready || busy) return;

    setBusy(true);
    setFields({});
    setError(null);

    try {
      const result = await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });

      // The new token keeps this tab signed in; the old sessions are gone.
      if (result?.accessToken) setToken(result.accessToken);

      setValues({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed. Your other sessions have been signed out.');
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Card>
      <CardHeader title="Password" description="Changing it signs out your other sessions" />
      <CardBody className="space-y-4">
        <Field label="Current password" error={fields.currentPassword}>
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={set('currentPassword')}
            />
          )}
        </Field>

        <Field
          label="New password"
          error={fields.newPassword}
          hint="At least 10 characters with an uppercase letter, a lowercase letter and a number."
        >
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="new-password"
              value={values.newPassword}
              onChange={set('newPassword')}
            />
          )}
        </Field>

        <Field label="Confirm new password" error={mismatch ? 'These do not match' : undefined}>
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="new-password"
              value={values.confirm}
              onChange={set('confirm')}
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="text-[12.5px] text-[var(--danger)]">
            {error}
          </p>
        )}

        <Button variant="primary" loading={busy} disabled={!ready} onClick={submit}>
          Change password
        </Button>
      </CardBody>
    </Card>
  );
}
