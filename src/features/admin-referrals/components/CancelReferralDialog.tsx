import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useOptionalT } from '../../../i18n/useOptionalT';
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
  const t = useOptionalT().t;
  const cancel = useCancelReferral();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const handleSubmit = async () => {
    const nextReasonError = validateReason(reason, t);
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
      const outcome = describeActionError(error, 'cancel', t);
      if (outcome.kind === 'conflict') onConflict(outcome.message);
      else setFailure(outcome.message);
    }
  };

  return (
    <ActionDialog
      title={t('adminReferrals.cancelDialog.title', 'Cancel referral')}
      description={
        <>
          <p>
            {t(
              'adminReferrals.cancelDialog.description',
              "This closes the {specialty} referral from {doctor}. It can't be undone — a new referral would have to come from a consultation.",
              {
                specialty: referral.targetSpecialty.name,
                doctor: referral.referringDoctor.fullName,
              },
            )}
          </p>
          <p className={styles.patientNotice}>
            {t(
              'adminReferrals.cancelDialog.patientNotice',
              'docforum-core notifies the patient that their referral was cancelled.',
            )}
          </p>
        </>
      }
      busy={cancel.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={cancel.isPending}>
            {t('adminReferrals.cancelDialog.keep', 'Keep referral')}
          </Button>
          <Button type="submit" variant="danger" loading={cancel.isPending}>
            {cancel.isPending
              ? t('adminReferrals.cancelDialog.cancelling', 'Cancelling…')
              : t('adminReferrals.cancelDialog.submit', 'Cancel referral')}
          </Button>
        </>
      }
    >
      <ReasonField
        label={t('adminReferrals.cancelDialog.reasonLabel', 'Reason for cancelling')}
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
