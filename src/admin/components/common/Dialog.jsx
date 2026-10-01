import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/admin/components/ui/button';
import { Field, Textarea } from '@/admin/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A modal on a wide screen, a bottom sheet on a narrow one.
 *
 * The same component either way, because a detail panel and a confirmation are
 * the same interaction at different sizes — and the brief asks for sheets on
 * mobile rather than a shrunken dialog.
 */
export function Modal({ open, onOpenChange, title, description, children, size = 'md', className }) {
  const width = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl'
  }[size];

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Root open modal onOpenChange={onOpenChange}>
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="fixed inset-0 z-40 bg-black/55"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                // Up from the bottom on a phone, a small scale on a desktop.
                initial={{ opacity: 0, y: 24, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.99 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-hair bg-elevated shadow-[var(--shadow-float)]',
                  'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-card)] sm:border',
                  width,
                  className
                )}
              >
                <div className="flex items-start justify-between gap-3 border-b border-hair px-4 py-3">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="text-[15px] font-semibold text-body">
                      {title}
                    </DialogPrimitive.Title>
                    {description && (
                      <DialogPrimitive.Description className="mt-0.5 text-[13px] text-muted">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  <DialogPrimitive.Close asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Close">
                      <X aria-hidden />
                    </Button>
                  </DialogPrimitive.Close>
                </div>

                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  );
}

/**
 * Confirmation for something consequential.
 *
 * `requireReason` asks for one and passes it to the handler, because "who
 * blocked this rider and why" is the question the audit log exists to answer,
 * and a blank reason field makes that log useless.
 *
 * Deliberately not used for harmless changes — a confirmation on everything
 * trains people to click through confirmations.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonHint,
  onConfirm
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    if (requireReason && !reason.trim()) {
      setError('Please say why — this goes in the audit log.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim() || undefined);
      setReason('');
      onOpenChange(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          if (!next) {
            setReason('');
            setError(null);
          }
          onOpenChange(next);
        }
      }}
      title={title}
      size="sm"
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--danger-wash)] text-[var(--danger)]">
              <AlertTriangle className="size-4" aria-hidden />
            </span>
          )}
          <p className="text-[13.5px] leading-relaxed text-muted">{description}</p>
        </div>

        {requireReason && (
          <Field label={reasonLabel} hint={reasonHint} error={error} required>
            {(props) => (
              <Textarea
                {...props}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Recorded in the audit log"
              />
            )}
          </Field>
        )}

        {!requireReason && error && (
          <p role="alert" className="text-[12.5px] text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
