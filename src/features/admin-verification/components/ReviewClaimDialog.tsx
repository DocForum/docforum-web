import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { useReviewSpecialtyClaim } from '../hooks/useSpecialtyClaims';
import { describeReviewError } from '../errors';
import { normaliseReason, validateReason } from '../reason';
import { ActionDialog } from './ActionDialog';
import { ReasonField } from './ReasonField';
import type { ClaimDecision, SpecialtyClaim } from '../../../types/models';
import styles from './SpecialtyClaims.module.css';

interface ReviewClaimDialogProps {
  claim: SpecialtyClaim;
  /** Which decision the admin picked on the card — the dialog can still
   * switch between them before submitting. */
  initialDecision: ClaimDecision;
  onClose: () => void;
  onReviewed: (decision: ClaimDecision, claim: SpecialtyClaim) => void;
  onConflict: (message: string) => void;
}

/** Approve or reject one specialty claim. A rejection is shown to the
 * doctor as what to fix or resubmit, so its reason is required and the
 * dialog says so plainly; an approval may carry an optional note. */
export function ReviewClaimDialog({
  claim,
  initialDecision,
  onClose,
  onReviewed,
  onConflict,
}: ReviewClaimDialogProps) {
  const t = useOptionalT().t;
  const review = useReviewSpecialtyClaim();
  const [decision, setDecision] = useState<ClaimDecision>(initialDecision);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const rejecting = decision === 'reject';

  const handleSubmit = async () => {
    const nextError = validateReason(reason, rejecting, t);
    setReasonError(nextError);
    setFailure(null);
    if (nextError) return;

    try {
      await review.mutateAsync({
        claimId: claim.id,
        input: {
          decision,
          reason: normaliseReason(reason) || null,
          expectedUpdatedAt: claim.updatedAt,
        },
      });
      onReviewed(decision, claim);
    } catch (error) {
      const outcome = describeReviewError(error, decision, t);
      if (outcome.kind === 'conflict') onConflict(outcome.message);
      else setFailure(outcome.message);
    }
  };

  return (
    <ActionDialog
      title={t('adminVerification.reviewDialog.title', 'Review specialty claim')}
      description={
        <>
          <p>
            {t('adminVerification.reviewDialog.claim', '{doctor} claims {specialty}.', {
              doctor: claim.doctor.fullName,
              specialty: claim.specialty.name,
            })}{' '}
            {t(
              'adminVerification.reviewDialog.onlyApproved',
              'Only pairs you approve count for search and referral routing — a rejected claim never routes patients.',
            )}
          </p>
          <p className={styles.doctorNotice}>
            {rejecting
              ? t(
                  'adminVerification.reviewDialog.rejectNotice',
                  'The doctor is told your reason as what to fix or resubmit. Write it for them, not for the audit trail.',
                )
              : t(
                  'adminVerification.reviewDialog.approveNotice',
                  'Approving lets {doctor} appear in {specialty} searches and receive {specialty} referrals.',
                  { doctor: claim.doctor.fullName, specialty: claim.specialty.name },
                )}
          </p>
        </>
      }
      busy={review.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={review.isPending}>
            {t('adminVerification.reviewDialog.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant={rejecting ? 'danger' : 'primary'} loading={review.isPending}>
            {review.isPending
              ? rejecting
                ? t('adminVerification.reviewDialog.rejecting', 'Rejecting…')
                : t('adminVerification.reviewDialog.approving', 'Approving…')
              : rejecting
                ? t('adminVerification.reviewDialog.rejectClaim', 'Reject claim')
                : t('adminVerification.reviewDialog.approveClaim', 'Approve claim')}
          </Button>
        </>
      }
    >
      <fieldset className={styles.field}>
        <legend className={styles.fieldLabel}>{t('adminVerification.reviewDialog.decisionLabel', 'Decision')}</legend>
        <label>
          <input
            type="radio"
            name="decision"
            value="approve"
            checked={decision === 'approve'}
            onChange={() => {
              setDecision('approve');
              setReasonError(null);
            }}
            disabled={review.isPending}
          />{' '}
          {t('adminVerification.decision.approve', 'Approve')}
        </label>
        <label>
          <input
            type="radio"
            name="decision"
            value="reject"
            checked={rejecting}
            onChange={() => {
              setDecision('reject');
              setReasonError(null);
            }}
            disabled={review.isPending}
          />{' '}
          {t('adminVerification.decision.reject', 'Reject')}
        </label>
      </fieldset>
      <ReasonField
        label={
          rejecting
            ? t('adminVerification.reviewDialog.reasonLabelReject', 'Reason sent to the doctor (required)')
            : t('adminVerification.reviewDialog.reasonLabelApprove', 'Note for the audit trail (optional)')
        }
        hint={
          rejecting
            ? t(
                'adminVerification.reviewDialog.reasonHintReject',
                'Required — say which credential is missing or invalid and what to resubmit. The doctor sees this text.',
              )
            : t(
                'adminVerification.reviewDialog.reasonHintApprove',
                'Optional. Saved to the audit trail with your admin account; the doctor is not shown this text.',
              )
        }
        value={reason}
        onChange={(value) => {
          setReason(value);
          if (reasonError) setReasonError(null);
        }}
        error={reasonError}
        disabled={review.isPending}
      />
      <FormError message={failure} />
    </ActionDialog>
  );
}
