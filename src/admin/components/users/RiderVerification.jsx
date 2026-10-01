import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { ConfirmDialog } from '@/admin/components/common/Dialog';
import { Button } from '@/admin/components/ui/button';
import { Badge, Card, CardBody, CardHeader } from '@/admin/components/ui/misc';
import * as riderApi from '@/admin/services/rider.api';
import {
  VERIFICATION,
  VERIFICATION_CAN_WORK,
  VERIFICATION_LABEL,
  VERIFICATION_TONE
} from '@/admin/constants/status';
import { formatDateTime } from '@/admin/utils/format';

/**
 * The decision about whether a rider may work.
 *
 * WHY THIS IS A CARD AND NOT A TOGGLE. Approving somebody to drive paying
 * passengers is not a preference, and the three outcomes are not symmetrical:
 * approval opens the road, rejection closes it and is told to the rider in
 * their own words, and sending an application back to PENDING is a correction
 * to an earlier decision. Each goes through a confirmation that states what
 * actually happens, because an accidental click here either puts an unchecked
 * rider on the road or takes a working one off it mid-shift.
 *
 * WHY REJECTION DEMANDS A NOTE. The server requires it (`riderVerificationSchema`
 * refuses a REJECTED without at least three characters) and then shows that
 * text to the rider. Without it the rider's app would say only that they were
 * refused, with nothing to act on and nothing to appeal.
 *
 * WHAT THIS DOES NOT DO. It does not take the rider offline itself, or decide
 * whether an unapproved rider can work. The server does both: rejecting an
 * online rider ends their shift in the same transaction, and refuses outright
 * if they are carrying a passenger. Duplicating that here would mean two
 * places to keep in step and a console that could disagree with the database.
 */
export function RiderVerification({ rider, canUpdate, onChanged }) {
  const [pendingChoice, setPendingChoice] = useState(null);

  const status = rider.verificationStatus || VERIFICATION.PENDING;
  const canWork = VERIFICATION_CAN_WORK.includes(status);

  /**
   * What each button does, and what the confirmation says before it happens.
   *
   * `onRide` matters only for the two decisions that would end a shift: the
   * server refuses those while a passenger is aboard, so the button says so up
   * front rather than letting the admin discover it from an error toast.
   */
  const onRide = Boolean(rider.activeRideId);

  const CHOICES = {
    [VERIFICATION.APPROVED]: {
      label: 'Approve',
      icon: CheckCircle2,
      variant: 'primary',
      title: 'Approve this rider',
      description:
        'They will be able to go online and receive ride offers straight away, and their app updates without a reload. Check the vehicle and licence details above first — once approved, they are carrying passengers.',
      confirmLabel: 'Approve the rider',
      tone: 'primary',
      requireReason: false
    },
    [VERIFICATION.REJECTED]: {
      label: 'Reject',
      icon: XCircle,
      variant: 'dangerOutline',
      title: 'Do not approve this rider',
      description: onRide
        ? 'This rider is on a ride right now, so the server will refuse until that ride is resolved.'
        : 'They will not be able to go online, and if they are online now their shift ends immediately. The reason below is shown to them in their own app, so write it for them to read.',
      confirmLabel: 'Reject the application',
      tone: 'danger',
      requireReason: true,
      reasonLabel: 'Why they were not approved',
      reasonHint: 'The rider sees this text. Be specific enough that they know what to fix.'
    },
    [VERIFICATION.PENDING]: {
      label: 'Send back for review',
      icon: RotateCcw,
      variant: 'outline',
      title: 'Send this application back for review',
      description: onRide
        ? 'This rider is on a ride right now, so the server will refuse until that ride is resolved.'
        : 'This undoes the earlier decision and puts them back in the queue. They cannot work while an application is pending, so an approved rider who is online will be taken off the road.',
      confirmLabel: 'Send back for review',
      tone: 'primary',
      // No note field: `ConfirmDialog` only renders one when it is required,
      // and the server does not demand a reason for this direction.
      requireReason: false
    }
  };

  async function apply(choice, note) {
    const result = await riderApi.setVerification(rider.id, choice, note);
    toast.success(
      result?.unchanged
        ? 'That was already the status — nothing changed.'
        : `Rider ${VERIFICATION_LABEL[choice].toLowerCase()}.`
    );
    onChanged?.();
  }

  // The status the rider is already on is not offered as a button.
  const offered = Object.keys(CHOICES).filter((choice) => choice !== status);
  const chosen = pendingChoice ? CHOICES[pendingChoice] : null;

  return (
    <>
      <Card>
        <CardHeader
          title="Verification"
          action={
            <Badge tone={VERIFICATION_TONE[status] || 'neutral'} dot>
              {VERIFICATION_LABEL[status] || status}
            </Badge>
          }
        />
        <CardBody className="space-y-3 pt-1">
          <p className="text-[13px] text-muted">
            {canWork
              ? 'This rider can go online and receive ride offers.'
              : 'This rider cannot go online until the application is approved.'}
          </p>

          {rider.verificationNote && (
            <p className="rounded-[var(--radius-sm)] bg-sunken px-3 py-2 text-[12.5px] text-body">
              <span className="text-muted">Note shown to the rider: </span>
              {rider.verificationNote}
            </p>
          )}

          {rider.verifiedAt && (
            <p className="text-[12px] text-faint">Last decided {formatDateTime(rider.verifiedAt)}</p>
          )}

          {canUpdate ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {offered.map((choice) => {
                const { label, icon: Icon, variant } = CHOICES[choice];
                return (
                  <Button
                    key={choice}
                    size="md"
                    variant={variant}
                    onClick={() => setPendingChoice(choice)}
                  >
                    <Icon aria-hidden />
                    {label}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-faint">
              You do not have permission to change this.
            </p>
          )}
        </CardBody>
      </Card>

      {chosen && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendingChoice(null)}
          title={chosen.title}
          description={chosen.description}
          confirmLabel={chosen.confirmLabel}
          tone={chosen.tone}
          requireReason={chosen.requireReason}
          reasonLabel={chosen.reasonLabel}
          reasonHint={chosen.reasonHint}
          onConfirm={(note) => apply(pendingChoice, note)}
        />
      )}
    </>
  );
}
