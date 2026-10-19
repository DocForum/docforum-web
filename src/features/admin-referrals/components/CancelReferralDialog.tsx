import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useCancelReferral } from '../hooks/useStuckReferrals';
import { describeActionError } from '../errors';
import { normaliseReason, validateReason } from '../reason';
import { ActionDialog } from './ActionDialog';
import { ReasonField } from './ReasonField';
import type { StuckReferral } from '../../../types/models';
import styles from './StuckReferrals.module.css';

interface CancelReferralDialogProps {
  referral: StuckReferral;
  onClose: () => void;
  onCancelled: () => void;
  onConflict: (message: string) => void;
}

export function CancelReferralDialog({ referral, onClose, onCancelled, onConflict }: CancelReferralDialogProps) {
  const cancel = useCancelReferral();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const handleSubmit = async () => {
    const nextReasonError = validateReason(reason);
    setReasonError(nextReasonError);
    setFailure(null);
    if (nextReasonError) return;

    try {
      await cancel.mutateAsync({
        referralId: referral.id,
        input: { reason: normaliseReason(reason), expectedUpdatedAt: referral.updatedAt },
      });
      onCancelled();
    } catch (error) {
      const outcome = describeActionError(error, 'cancel');
      if (outcome.kind === 'conflict') onConflict(outcome.message);
      else setFailure(outcome.message);
    }
  };

  return (
    <ActionDialog
      title="Cancel referral"
      description={
        <>
          <p>
            This closes the {referral.targetSpecialty.name} referral from {referral.referringDoctor.fullName}. It
            can't be undone — a new referral would have to come from a consultation.
          </p>
          <p className={styles.patientNotice}>docforum-core notifies the patient that their referral was cancelled.</p>
        </>
      }
      busy={cancel.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={cancel.isPending}>
            Keep referral
          </Button>
          <Button type="submit" variant="danger" loading={cancel.isPending}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel referral'}
          </Button>
        </>
      }
    >
      <ReasonField
        label="Reason for cancelling"
        value={reason}
        onChange={(value) => {
          setReason(value);
          if (reasonError) setReasonError(null);
        }}
        error={reasonError}
        disabled={cancel.isPending}
      />
      <FormError message={failure} />
    </ActionDialog>
  );
}
