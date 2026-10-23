import { useId, useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
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

function describeAvailability(doctor: DoctorAvailability, timeZone: string): string {
  if (doctor.openSlotCount <= 0 || !doctor.nextAvailableAt) return 'No open slots in the next 7 days';
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
  const slots = doctor.openSlotCount === 1 ? '1 open slot' : `${doctor.openSlotCount} open slots`;
  return `${slots} in the next 7 days · next ${nextLabel}`;
}

export function ReassignDialog({ referral, onClose, onReassigned, onConflict }: ReassignDialogProps) {
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
    const nextReasonError = validateReason(reason);
    const nextPickError = selected ? null : 'Choose a doctor to reassign to.';
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
      const outcome = describeActionError(error, 'reassign');
      if (outcome.kind === 'conflict') onConflict(outcome.message);
      else setFailure(outcome.message);
    }
  };

  let picker;
  if (candidates.isLoading) {
    picker = (
      <div className={styles.inlineStatus} role="status">
        <Spinner size={16} />
        <span>Loading verified {specialty} doctors…</span>
      </div>
    );
  } else if (candidates.error) {
    const notServed = candidates.error instanceof ApiError && candidates.error.status === 404;
    picker = (
      <div className={styles.inlineError} role="alert">
        <p>
          {notServed
            ? "docforum-core can't list doctors for reassignment yet (docforum-core#68)."
            : "Couldn't load doctors for this specialty."}
        </p>
        {!notServed && (
          <Button type="button" variant="secondary" onClick={() => void candidates.refetch()}>
            Try again
          </Button>
        )}
      </div>
    );
  } else if (eligible.length === 0) {
    picker = (
      <p className={styles.inlineEmpty}>
        No other verified {specialty} doctor can take this referral. Cancel it instead, or verify a doctor in this
        specialty first.
      </p>
    );
  } else {
    picker = (
      <fieldset className={styles.picker} aria-describedby={pickError ? `${groupName}-error` : undefined}>
        <legend className={styles.fieldLabel}>Verified {specialty} doctors</legend>
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
                    {describeAvailability(doctor, timeZone)}
                  </span>
                  {inChain.has(doctor.id) && (
                    <span className={styles.chainWarning}>Already in this referral's chain</span>
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

  return (
    <ActionDialog
      title="Reassign referral"
      description={
        <p>
          Hand this {specialty} referral to another verified doctor in the same specialty. The referral's clinical
          snapshot doesn't change. Currently with:{' '}
          <strong>{referral.targetDoctor?.fullName ?? 'no doctor'}</strong>.
        </p>
      }
      busy={reassign.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={reassign.isPending}>
            Back
          </Button>
          <Button type="submit" loading={reassign.isPending} disabled={eligible.length === 0}>
            {reassign.isPending ? 'Reassigning…' : 'Reassign referral'}
          </Button>
        </>
      }
    >
      {picker}
      {ineligibleCount > 0 && (
        <p className={styles.fieldHint}>
          {ineligibleCount === 1 ? '1 doctor' : `${ineligibleCount} doctors`} returned by docforum-core{' '}
          {ineligibleCount === 1 ? 'was' : 'were'} hidden because they aren't verified in {specialty}.
        </p>
      )}
      <ReasonField
        label="Reason for reassigning"
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
