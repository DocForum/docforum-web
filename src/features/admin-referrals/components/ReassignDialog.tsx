import { useId, useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
import { useOptionalT } from '../../../i18n/useOptionalT';
import type { Translator } from '../../../i18n/useT';
import { useReassignCandidates, useReassignReferral } from '../hooks/useStuckReferrals';
import { chainDoctorIds, eligibleCandidates } from '../eligibility';
import { describeActionError } from '../errors';
import { normaliseReason, validateReason } from '../reason';
import { ActionDialog } from './ActionDialog';
import { ReasonField } from './ReasonField';
import type { DoctorAvailability, StuckReferral } from '../../../types/models';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDateTime } from '../../../i18n/time-zone';
import styles from './StuckReferrals.module.css';

interface ReassignDialogProps {
  referral: StuckReferral;
  onClose: () => void;
  onReassigned: (doctor: DoctorAvailability) => void;
  onConflict: (message: string) => void;
}

function describeAvailability(doctor: DoctorAvailability, timeZone: string, t: Translator): string {
  if (doctor.openSlotCount <= 0 || !doctor.nextAvailableAt) {
    return t('adminReferrals.reassign.noSlots', 'No open slots in the next 7 days');
  }
  const next = new Date(doctor.nextAvailableAt);
  const nextLabel = Number.isNaN(next.getTime())
    ? doctor.nextAvailableAt
    : formatDateTime(doctor.nextAvailableAt, timeZone, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
  return t(
    'adminReferrals.reassign.availability',
    '{count, plural, one {# open slot} other {# open slots}} in the next 7 days · next {next}',
    { count: doctor.openSlotCount, next: nextLabel },
  );
}

export function ReassignDialog({ referral, onClose, onReassigned, onConflict }: ReassignDialogProps) {
  const t = useOptionalT().t;
  const groupName = useId();
  const { timeZone } = useTimeZone();
  const specialty = referral.targetSpecialty.name;
  const candidates = useReassignCandidates(referral.targetSpecialtyId);
  const reassign = useReassignReferral();

  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const { eligible, ineligibleCount } = useMemo(
    () => eligibleCandidates(referral, candidates.data ?? []),
    [referral, candidates.data],
  );
  const inChain = useMemo(() => chainDoctorIds(referral), [referral]);
  // A refetch can drop the doctor that was picked (their verification was
  // revoked, say) — then nothing is selected rather than a stale id.
  const selected = eligible.find((doctor) => doctor.id === doctorId) ?? null;

  const handleSubmit = async () => {
    const nextReasonError = validateReason(reason, t);
    const nextPickError = selected
      ? null
      : t('adminReferrals.reassign.chooseDoctor', 'Choose a doctor to reassign to.');
    setReasonError(nextReasonError);
    setPickError(nextPickError);
    setFailure(null);
    if (nextReasonError || nextPickError || !selected) return;

    try {
      await reassign.mutateAsync({
        referralId: referral.id,
        input: {
          targetDoctorId: selected.id,
          reason: normaliseReason(reason),
          expectedUpdatedAt: referral.updatedAt,
        },
      });
      onReassigned(selected);
    } catch (error) {
      const outcome = describeActionError(error, 'reassign', t);
      if (outcome.kind === 'conflict') onConflict(outcome.message);
      else setFailure(outcome.message);
    }
  };

  let picker;
  if (candidates.isLoading) {
    picker = (
      <div className={styles.inlineStatus} role="status">
        <Spinner size={16} />
        <span>{t('adminReferrals.reassign.loadingDoctors', 'Loading verified {specialty} doctors…', { specialty })}</span>
      </div>
    );
  } else if (candidates.error) {
    const notServed = candidates.error instanceof ApiError && candidates.error.status === 404;
    picker = (
      <div className={styles.inlineError} role="alert">
        <p>
          {notServed
            ? t(
                'adminReferrals.reassign.notServed',
                "docforum-core can't list doctors for reassignment yet (docforum-core#68).",
              )
            : t('adminReferrals.reassign.loadFailed', "Couldn't load doctors for this specialty.")}
        </p>
        {!notServed && (
          <Button type="button" variant="secondary" onClick={() => void candidates.refetch()}>
            {t('adminReferrals.reassign.tryAgain', 'Try again')}
          </Button>
        )}
      </div>
    );
  } else if (eligible.length === 0) {
    picker = (
      <p className={styles.inlineEmpty}>
        {t(
          'adminReferrals.reassign.noCandidates',
          'No other verified {specialty} doctor can take this referral. Cancel it instead, or verify a doctor in this specialty first.',
          { specialty },
        )}
      </p>
    );
  } else {
    picker = (
      <fieldset className={styles.picker} aria-describedby={pickError ? `${groupName}-error` : undefined}>
        <legend className={styles.fieldLabel}>
          {t('adminReferrals.reassign.verifiedDoctors', 'Verified {specialty} doctors', { specialty })}
        </legend>
        <ul className={styles.candidateList}>
          {eligible.map((doctor) => (
            <li key={doctor.id}>
              <label className={`${styles.candidate} ${doctor.id === doctorId ? styles.candidateSelected : ''}`}>
                <input
                  type="radio"
                  name={groupName}
                  value={doctor.id}
                  checked={doctor.id === doctorId}
                  onChange={() => {
                    setDoctorId(doctor.id);
                    setPickError(null);
                  }}
                  disabled={reassign.isPending}
                />
                <span className={styles.candidateText}>
                  <span className={styles.candidateName}>{doctor.fullName}</span>
                  <span className={doctor.openSlotCount > 0 ? styles.availability : styles.availabilityNone}>
                    {describeAvailability(doctor, timeZone, t)}
                  </span>
                  {inChain.has(doctor.id) && (
                    <span className={styles.chainWarning}>
                      {t('adminReferrals.reassign.inChain', "Already in this referral's chain")}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {pickError && (
          <p id={`${groupName}-error`} className={styles.fieldError} role="alert">
            {pickError}
          </p>
        )}
      </fieldset>
    );
  }

  const currentDoctor = referral.targetDoctor?.fullName ?? t('adminReferrals.reassign.noDoctor', 'no doctor');

  return (
    <ActionDialog
      title={t('adminReferrals.reassign.title', 'Reassign referral')}
      description={
        <p>
          {t(
            'adminReferrals.reassign.description',
            "Hand this {specialty} referral to another verified doctor in the same specialty. The referral's clinical snapshot doesn't change. Currently with:",
            { specialty },
          )}{' '}
          <strong>{currentDoctor}</strong>.
        </p>
      }
      busy={reassign.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={reassign.isPending}>
            {t('adminReferrals.reassign.back', 'Back')}
          </Button>
          <Button type="submit" loading={reassign.isPending} disabled={eligible.length === 0}>
            {reassign.isPending
              ? t('adminReferrals.reassign.reassigning', 'Reassigning…')
              : t('adminReferrals.reassign.submit', 'Reassign referral')}
          </Button>
        </>
      }
    >
      {picker}
      {ineligibleCount > 0 && (
        <p className={styles.fieldHint}>
          {t(
            'adminReferrals.reassign.ineligible',
            '{count, plural, one {# doctor} other {# doctors}} returned by docforum-core {count, plural, one {was} other {were}} hidden because they aren’t verified in {specialty}.',
            { count: ineligibleCount, specialty },
          )}
        </p>
      )}
      <ReasonField
        label={t('adminReferrals.reassign.reasonLabel', 'Reason for reassigning')}
        value={reason}
        onChange={(value) => {
          setReason(value);
          if (reasonError) setReasonError(null);
        }}
        error={reasonError}
        disabled={reassign.isPending}
      />
      <FormError message={failure} />
    </ActionDialog>
  );
}
