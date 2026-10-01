import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { AppBar } from '@/components/common/AppBar';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/misc';
import { useAuth } from '@/hooks/useAuth';
import * as authApi from '@/services/auth.api';
import { initialsOf } from '@/utils/format';


/**
 * Account details and preferences, shared by both apps. Role-specific sections
 * (vehicle, licence) are passed in as children, and `links` holds the screens
 * that hang off the profile rather than the tab bar.
 */
export function ProfileScreen({ title = 'Profile', links = [], children }) {
  const { user, logout, refreshUser } = useAuth();

  const [values, setValues] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = values.name !== user?.name || values.phone !== user?.phone;

  async function save() {
    if (!dirty || saving) return;

    setSaving(true);
    setErrors({});
    try {
      await authApi.updateProfile({ name: values.name.trim(), phone: values.phone.trim() });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-app pb-safe-nav">
      <AppBar title={title} />

      <div className="space-y-3 px-4 md:mx-auto md:max-w-2xl">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--accent)]/15 text-lg font-semibold text-[var(--accent)]">
                {initialsOf(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-body">{user?.name}</p>
                <p className="truncate text-sm text-muted">{user?.email}</p>
              </div>
            </div>

            <Separator />

            <Field label="Name" error={errors.name}>
              {(props) => (
                <Input
                  {...props}
                  value={values.name}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                />
              )}
            </Field>

            <Field label="Phone" error={errors.phone}>
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  inputMode="tel"
                  value={values.phone}
                  onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
                />
              )}
            </Field>

            <Button block disabled={!dirty} loading={saving} onClick={save}>
              Save changes
            </Button>
          </CardBody>
        </Card>

        {links.length > 0 && (
          <Card>
            <CardBody className="p-2">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-faint">
                    <link.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-body">{link.title}</span>
                    {link.hint && <span className="block truncate text-[12px] text-muted">{link.hint}</span>}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                </Link>
              ))}
            </CardBody>
          </Card>
        )}

        {children}

        <Button variant="danger" block onClick={logout}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </div>
    </div>
  );
}
