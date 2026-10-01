import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { PageHeader } from '@/admin/components/common/PageHeader';
import { FilterBar } from '@/admin/components/common/FilterBar';
import { DataTable, Pagination } from '@/admin/components/tables/DataTable';
import { Modal } from '@/admin/components/common/Dialog';
import { Button } from '@/admin/components/ui/button';
import { Field, Input, Select } from '@/admin/components/ui/input';
import { Badge, Card, Switch } from '@/admin/components/ui/misc';
import { useAsync } from '@/admin/hooks/useAsync';
import { useAuth } from '@/admin/hooks/useAuth';
import { useListQuery } from '@/admin/hooks/useListQuery';
import * as adminsApi from '@/admin/services/admins.api';
import { ADMIN_ROLES, PERMISSIONS, PERMISSION_LABEL, ROLE_LABEL } from '@/admin/constants/permissions';
import { formatDateTime, formatRelative, plural } from '@/admin/utils/format';

/**
 * Admin accounts.
 *
 * Only a super admin can create or change one — enforced on the backend, not
 * just hidden here. Everyone with admins.read can see the list, which is what
 * makes "who can change the fare" an answerable question for the whole team.
 */
export default function Admins() {
  const { admin: me, can } = useAuth();
  const isSuper = me?.role === ADMIN_ROLES.SUPER_ADMIN;
  const manage = isSuper && can(PERMISSIONS.ADMINS_MANAGE);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  const { query, page, setPage, search, setSearch, read, setFilter, reset, searching } = useListQuery({ limit: 25 });

  const { data, loading, error, refetch } = useAsync(
    useCallback(() => adminsApi.list(query), [query]),
    [query]
  );

  const columns = [
    {
      key: 'name',
      header: 'Admin',
      primary: true,
      render: (admin) => (
        <div className="min-w-0">
          <p className="truncate">
            {admin.name}
            {admin.id === me?.id && <span className="ml-1.5 text-[11.5px] text-faint">you</span>}
          </p>
          <p className="truncate text-[11.5px] text-muted">{admin.email}</p>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      secondary: true,
      width: '9rem',
      render: (admin) => (
        <Badge tone={admin.role === ADMIN_ROLES.SUPER_ADMIN ? 'accent' : 'neutral'}>
          {ROLE_LABEL[admin.role] || admin.role}
        </Badge>
      )
    },
    {
      key: 'permissions',
      header: 'Permissions',
      align: 'right',
      width: '7rem',
      hideBelow: true,
      render: (admin) => <span className="tabular text-muted">{admin.permissions?.length ?? 0}</span>
    },
    {
      key: 'lastLogin',
      header: 'Last signed in',
      align: 'right',
      width: '9rem',
      render: (admin) => (
        <span className="text-muted">{admin.lastLoginAt ? formatRelative(admin.lastLoginAt) : 'Never'}</span>
      )
    },
    {
      key: 'created',
      header: 'Created',
      align: 'right',
      width: '11rem',
      hideBelow: true,
      render: (admin) => <span className="text-muted">{formatDateTime(admin.createdAt)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      width: '6.5rem',
      render: (admin) => (
        <Badge tone={admin.isActive ? 'success' : 'danger'}>{admin.isActive ? 'Active' : 'Disabled'}</Badge>
      )
    },
    {
      key: 'actions',
      header: '',
      width: '10rem',
      align: 'right',
      render: (admin) =>
        manage ? (
          <span className="flex justify-end gap-1">
            <Button size="sm" onClick={() => setEditing(admin)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" aria-label="Reset password" onClick={() => setResetting(admin)}>
              <KeyRound aria-hidden />
            </Button>
          </span>
        ) : null
    }
  ];

  return (
    <>
      <PageHeader
        title="Admins"
        description={data?.total != null ? plural(data.total, 'admin') : undefined}
        actions={
          manage ? (
            <Button variant="primary" size="md" onClick={() => setCreating(true)}>
              <UserPlus aria-hidden />
              New admin
            </Button>
          ) : null
        }
      />

      {!isSuper && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-card)] border border-hair bg-sunken p-3 text-[12.5px]">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-muted">
            Only a super admin can create or change admin accounts. You can see who holds what.
          </p>
        </div>
      )}

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Name or email…"
        onReset={reset}
        filters={[
          {
            key: 'role',
            label: 'Role',
            value: read('role', ''),
            onChange: (value) => setFilter('role', value),
            options: Object.values(ADMIN_ROLES).map((role) => ({ value: role, label: ROLE_LABEL[role] }))
          },
          {
            key: 'isActive',
            label: 'Status',
            value: read('isActive', ''),
            onChange: (value) => setFilter('isActive', value),
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Disabled' }
            ]
          }
        ]}
      />

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.admins}
          loading={loading}
          refreshing={searching || (loading && Boolean(data))}
          error={error}
          onRetry={refetch}
          empty={{ icon: ShieldCheck, title: 'No admins match' }}
        />
        <Pagination page={page} limit={data?.limit || 25} total={data?.total || 0} onPage={setPage} />
      </Card>

      <AdminFormModal
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          refetch();
        }}
      />

      <AdminFormModal
        key={editing?.id}
        admin={editing}
        open={Boolean(editing)}
        onOpenChange={(next) => !next && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
        isSelf={editing?.id === me?.id}
      />

      <ResetPasswordModal
        key={`reset-${resetting?.id}`}
        admin={resetting}
        open={Boolean(resetting)}
        onOpenChange={(next) => !next && setResetting(null)}
        onDone={() => setResetting(null)}
      />
    </>
  );
}

/**
 * Create or edit.
 *
 * The permission list is fetched from the backend rather than hard-coded, so
 * adding a permission server-side makes it grantable here without a frontend
 * change. Role defaults are shown as already-checked and disabled, because
 * granting a permission the role already carries does nothing.
 */
function AdminFormModal({ admin, open, onOpenChange, onSaved, isSelf = false }) {
  const editing = Boolean(admin);

  const [values, setValues] = useState(() => ({
    name: admin?.name || '',
    email: admin?.email || '',
    password: '',
    role: admin?.role || ADMIN_ROLES.SUPPORT,
    isActive: admin?.isActive ?? true,
    extraPermissions: [],
    deniedPermissions: []
  }));
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: matrix } = useAsync(
    useCallback(() => (open ? adminsApi.permissions() : Promise.resolve(null)), [open]),
    [open]
  );

  const roleDefaults = new Set(matrix?.rolePermissions?.[values.role] || []);
  const allPermissions = matrix?.permissions || [];

  async function save() {
    if (busy) return;

    setBusy(true);
    setFields({});
    setError(null);

    try {
      if (editing) {
        const patch = {};
        if (values.name !== admin.name) patch.name = values.name.trim();
        if (values.role !== admin.role) patch.role = values.role;
        if (values.isActive !== admin.isActive) patch.isActive = values.isActive;
        if (values.extraPermissions.length) patch.extraPermissions = values.extraPermissions;
        if (values.deniedPermissions.length) patch.deniedPermissions = values.deniedPermissions;

        if (!Object.keys(patch).length) {
          onOpenChange(false);
          return;
        }

        await adminsApi.update(admin.id, patch);
        toast.success('Admin updated');
      } else {
        await adminsApi.create({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          role: values.role,
          ...(values.extraPermissions.length ? { extraPermissions: values.extraPermissions } : {}),
          ...(values.deniedPermissions.length ? { deniedPermissions: values.deniedPermissions } : {})
        });
        toast.success('Admin created');
      }
      onSaved();
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  const toggleExtra = (permission) =>
    setValues((current) => ({
      ...current,
      extraPermissions: current.extraPermissions.includes(permission)
        ? current.extraPermissions.filter((p) => p !== permission)
        : [...current.extraPermissions, permission]
    }));

  const toggleDenied = (permission) =>
    setValues((current) => ({
      ...current,
      deniedPermissions: current.deniedPermissions.includes(permission)
        ? current.deniedPermissions.filter((p) => p !== permission)
        : [...current.deniedPermissions, permission]
    }));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={editing ? `Edit ${admin.name}` : 'New admin'}
      size="lg"
    >
      <div className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={fields.name} required>
            {(props) => <Input {...props} value={values.name} onChange={set('name')} />}
          </Field>

          <Field
            label="Email"
            error={fields.email}
            required={!editing}
            hint={editing ? 'Cannot be changed' : undefined}
          >
            {(props) => (
              <Input {...props} type="email" value={values.email} onChange={set('email')} disabled={editing} />
            )}
          </Field>
        </div>

        {!editing && (
          <Field
            label="Password"
            error={fields.password}
            required
            hint="At least 10 characters with an uppercase letter, a lowercase letter and a number. Give it to them directly — nothing is emailed."
          >
            {(props) => (
              <Input
                {...props}
                type="text"
                autoComplete="new-password"
                value={values.password}
                onChange={set('password')}
              />
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Role"
            error={fields.role}
            hint={isSelf ? 'You cannot change your own role' : `${roleDefaults.size} permissions by default`}
          >
            {(props) => (
              <Select {...props} value={values.role} onChange={set('role')} disabled={isSelf}>
                {Object.values(ADMIN_ROLES).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {editing && (
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-body">Account</p>
              <div className="flex h-9 items-center gap-2.5">
                <Switch
                  checked={values.isActive}
                  disabled={isSelf}
                  onCheckedChange={(next) => setValues((current) => ({ ...current, isActive: next }))}
                  aria-label="Account active"
                />
                <span className="text-[13px] text-muted">
                  {values.isActive ? 'Active' : 'Disabled — all sessions ended'}
                </span>
              </div>
              {isSelf && <p className="mt-1 text-[12px] text-muted">You cannot disable your own account.</p>}
            </div>
          )}
        </div>

        {allPermissions.length > 0 && (
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-body">Permissions</p>
            <p className="mb-2 text-[12px] text-muted">
              The role's own permissions are shown as granted. Tick to add one on top, or revoke one the role
              normally carries.
            </p>

            <div className="max-h-64 overflow-y-auto rounded-[var(--radius-field)] border border-hair">
              <ul className="divide-y divide-[var(--border)]">
                {allPermissions.map((permission) => {
                  const fromRole = roleDefaults.has(permission);
                  const granted = values.extraPermissions.includes(permission);
                  const denied = values.deniedPermissions.includes(permission);
                  const effective = (fromRole || granted) && !denied;

                  return (
                    <li key={permission} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] text-body">
                          {PERMISSION_LABEL[permission] || permission}
                        </span>
                        <span className="mono block text-[11px] text-faint">{permission}</span>
                      </span>

                      {fromRole ? (
                        <label className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-muted">
                          <input
                            type="checkbox"
                            checked={denied}
                            onChange={() => toggleDenied(permission)}
                            className="size-3.5 accent-[var(--danger)]"
                          />
                          Revoke
                        </label>
                      ) : (
                        <label className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-muted">
                          <input
                            type="checkbox"
                            checked={granted}
                            onChange={() => toggleExtra(permission)}
                            className="size-3.5 accent-[var(--accent)]"
                          />
                          Grant
                        </label>
                      )}

                      <Badge tone={effective ? 'success' : 'neutral'} className="w-[4.5rem] shrink-0 justify-center">
                        {effective ? 'Allowed' : 'No'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {fields.permissions && (
          <p role="alert" className="text-[12.5px] text-[var(--danger)]">
            {fields.permissions}
          </p>
        )}
        {error && (
          <p role="alert" className="text-[12.5px] text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={save}>
            {editing ? 'Save changes' : 'Create admin'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Sets a new password and ends that admin's sessions.
 *
 * The password is typed here and handed over in person or through whatever
 * channel the team uses. Nothing is emailed, because no mail transport is
 * configured — and a dialog claiming to have sent an email that never left would
 * be worse than making the handover explicit.
 */
function ResetPasswordModal({ admin, open, onOpenChange, onDone }) {
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (busy) return;

    setBusy(true);
    setFields({});
    setError(null);

    try {
      await adminsApi.resetPassword(admin.id, password);
      setDone(true);
      toast.success('Password reset and sessions ended');
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!admin) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={`Reset the password for ${admin.name}`}
      size="sm"
    >
      <div className="space-y-4 p-4">
        {done ? (
          <>
            <p className="text-[13.5px] text-body">
              Done. Every session {admin.name} had open has ended, and they will need the new password to sign in.
            </p>
            <p className="rounded-[var(--radius-field)] bg-sunken p-3 text-[12.5px] text-muted">
              Give it to them yourself — the platform has no mail transport configured, so nothing was sent.
            </p>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setDone(false);
                  setPassword('');
                  onDone();
                }}
              >
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <Field
              label="New password"
              error={fields.newPassword}
              required
              hint="At least 10 characters with an uppercase letter, a lowercase letter and a number."
            >
              {(props) => (
                <Input
                  {...props}
                  type="text"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </Field>

            <p className="text-[12.5px] text-muted">
              This also signs {admin.name} out everywhere. The reset is recorded in the audit log, but the
              password itself never is.
            </p>

            {error && (
              <p role="alert" className="text-[12.5px] text-[var(--danger)]">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" loading={busy} disabled={password.length < 10} onClick={submit}>
                Reset the password
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
