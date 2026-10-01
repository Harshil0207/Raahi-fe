import { useState } from 'react';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Pencil } from 'lucide-react';
import { Button } from '@/admin/components/ui/button';
import { ConfirmDialog, Modal } from '@/admin/components/common/Dialog';
import { Field, Input } from '@/admin/components/ui/input';

/**
 * Block, unblock and correct contact details — the same three actions for a
 * customer and a rider, so the component takes the API functions rather than
 * being written twice.
 *
 * Blocking asks for a reason. Unblocking does not: restoring access is the safe
 * direction, and a required field on it just gets filled with "ok".
 */
export function AccountActions({ user, api, canEdit, canBlock, onChanged }) {
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!canEdit && !canBlock) return null;

  return (
    <>
      {canEdit && (
        <Button size="md" onClick={() => setEditing(true)}>
          <Pencil aria-hidden />
          Edit details
        </Button>
      )}

      {canBlock && (
        <Button
          size="md"
          variant={user.isActive ? 'dangerOutline' : 'outline'}
          onClick={() => setConfirm(true)}
        >
          {user.isActive ? <Ban aria-hidden /> : <CheckCircle2 aria-hidden />}
          {user.isActive ? 'Block account' : 'Unblock account'}
        </Button>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={user.isActive ? 'Block this account' : 'Unblock this account'}
        description={
          user.isActive
            ? 'They will be signed out everywhere and cannot sign in again until this is reversed. A rider is also taken offline. An account on a running ride cannot be blocked — resolve the ride first.'
            : 'They will be able to sign in again immediately.'
        }
        confirmLabel={user.isActive ? 'Block the account' : 'Unblock'}
        tone={user.isActive ? 'danger' : 'primary'}
        requireReason={user.isActive}
        reasonLabel="Why are you blocking this account?"
        reasonHint="Recorded in the audit log against your name."
        onConfirm={async (reason) => {
          await api.setBlocked(user._id, user.isActive, reason);
          toast.success(user.isActive ? 'Account blocked' : 'Account unblocked');
          onChanged();
        }}
      />

      <EditDetailsModal open={editing} onOpenChange={setEditing} user={user} api={api} onChanged={onChanged} />
    </>
  );
}

/**
 * Name and phone only.
 *
 * Email and role are deliberately absent: changing either would amount to
 * taking over the account, and the backend refuses both.
 */
function EditDetailsModal({ open, onOpenChange, user, api, onChanged }) {
  const [values, setValues] = useState({ name: user.name || '', phone: user.phone || '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const dirty = values.name !== user.name || values.phone !== user.phone;

  async function save() {
    if (!dirty || busy) return;

    setBusy(true);
    setFields({});
    setError(null);

    try {
      const patch = {};
      if (values.name !== user.name) patch.name = values.name.trim();
      if (values.phone !== user.phone) patch.phone = values.phone.trim();

      await api.updateAccount(user._id, patch);
      toast.success('Details updated');
      onChanged();
      onOpenChange(false);
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setFields(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Edit details" size="sm">
      <div className="space-y-4 p-4">
        <Field label="Name" error={fields.name}>
          {(props) => (
            <Input
              {...props}
              value={values.name}
              onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Phone" error={fields.phone}>
          {(props) => (
            <Input
              {...props}
              type="tel"
              value={values.phone}
              onChange={(event) => setValues((v) => ({ ...v, phone: event.target.value }))}
            />
          )}
        </Field>

        <p className="text-[12px] text-muted">
          Email and role cannot be changed from here — that would be taking over the account rather than
          correcting a typo.
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
          <Button variant="primary" loading={busy} disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
