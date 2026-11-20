import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type {
  ConsultationIssuedOrder,
  ConsultationOutcome,
  ConsultationRecord,
  ConsultationReferral,
} from '../../../types/models';
import {
  useCreateConsultationReferral,
  useIssueConsultationOrder,
  useRecordConsultation,
  useReferralSpecialties,
  useReferralDoctors,
} from '../hooks/useConsultationOutcome';
import styles from './ConsultationOutcomePanel.module.css';

interface ConsultationOutcomePanelProps {
  appointmentId: string;
  notes: string;
}

interface OutcomeResult {
  record: ConsultationRecord;
  referrals?: ConsultationReferral[];
  order?: ConsultationIssuedOrder;
}

interface ReferralTargetDraft {
  targetSpecialtyId: string;
  targetDoctorId: string;
  snapshotNotes: string;
}

const OUTCOMES: { value: ConsultationOutcome; label: string }[] = [
  { value: 'resolved', label: 'Resolved' },
  { value: 'referred', label: 'Referred' },
  { value: 'follow_up_needed', label: 'Follow-up needed' },
];

function ReferralTargetEditor({
  target,
  index,
  specialties,
  currentDoctorId,
  onChange,
  onRemove,
  canRemove,
  error,
}: {
  target: ReferralTargetDraft;
  index: number;
  specialties: { id: string; name: string }[];
  currentDoctorId?: string | null;
  onChange: (target: ReferralTargetDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
  error?: string;
}) {
  const doctorsQuery = useReferralDoctors(target.targetSpecialtyId || null);
  const eligibleDoctors = (doctorsQuery.data ?? []).filter(
    (doctor) => doctor.verificationStatus === 'verified' && doctor.id !== currentDoctorId,
  );

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Referral target {index + 1}</legend>
      <label className={styles.selectLabel}>
        Target specialty
        <select
          value={target.targetSpecialtyId}
          onChange={(event) =>
            onChange({ ...target, targetSpecialtyId: event.target.value, targetDoctorId: '' })
          }
          aria-invalid={Boolean(error)}
        >
          <option value="">Choose a specialty</option>
          {specialties.map((specialty) => (
            <option key={specialty.id} value={specialty.id}>
              {specialty.name}
            </option>
          ))}
        </select>
      </label>
      {target.targetSpecialtyId ? (
        <label className={styles.selectLabel}>
          Optional doctor
          <select
            value={target.targetDoctorId}
            onChange={(event) => onChange({ ...target, targetDoctorId: event.target.value })}
          >
            <option value="">Any eligible doctor</option>
            {eligibleDoctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className={styles.textareaLabel}>
        Snapshot notes
        <textarea
          className={styles.textarea}
          value={target.snapshotNotes}
          onChange={(event) => onChange({ ...target, snapshotNotes: event.target.value })}
        />
      </label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {canRemove ? (
        <Button type="button" variant="secondary" onClick={onRemove}>
          Remove target
        </Button>
      ) : null}
    </fieldset>
  );
}

export function ConsultationOutcomePanel({ appointmentId, notes }: ConsultationOutcomePanelProps) {
  const recordConsultation = useRecordConsultation();
  const createReferral = useCreateConsultationReferral();
  const issueOrder = useIssueConsultationOrder();
  const specialtiesQuery = useReferralSpecialties();
  const user = useAuthStore((state) => state.user);

  const [outcome, setOutcome] = useState<ConsultationOutcome>('resolved');
  const [followUpDays, setFollowUpDays] = useState('7');
  const [targets, setTargets] = useState<ReferralTargetDraft[]>([
    { targetSpecialtyId: '', targetDoctorId: '', snapshotNotes: '' },
  ]);
  const [wantsOrder, setWantsOrder] = useState(false);
  const [orderType, setOrderType] = useState<'prescription' | 'lab_order'>('prescription');
  const [medication, setMedication] = useState('');
  const [dose, setDose] = useState('');
  const [testName, setTestName] = useState('');
  const [orderInstructions, setOrderInstructions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<OutcomeResult | null>(null);

  const isSubmitting =
    recordConsultation.isPending || createReferral.isPending || issueOrder.isPending;

  const reset = () => {
    setResult(null);
    setSubmitError(null);
    setErrors({});
  };

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!notes.trim()) nextErrors.notes = 'Add consultation notes above before recording an outcome.';
    if (outcome === 'referred') {
      targets.forEach((target, index) => {
        if (!target.targetSpecialtyId && !target.targetDoctorId) {
          nextErrors[`target-${index}`] = 'Choose a target specialty.';
        }
        if (!target.snapshotNotes.trim()) {
          nextErrors[`notes-${index}`] = 'Snapshot notes are required.';
        }
      });
      const keys = targets.map((target) =>
        target.targetDoctorId ? `doctor:${target.targetDoctorId}` : `specialty:${target.targetSpecialtyId}`,
      );
      if (new Set(keys).size !== keys.length) {
        nextErrors.targets = 'Remove duplicate referral targets.';
      }
    }
    if (outcome === 'follow_up_needed') {
      const days = Number(followUpDays);
      if (!Number.isInteger(days) || days < 1 || days > 90) {
        nextErrors.followUpDays = 'Enter a whole number of days between 1 and 90.';
      }
    }
    if (wantsOrder) {
      if (orderType === 'prescription') {
        if (!medication.trim()) nextErrors.medication = 'Medication is required.';
        if (!dose.trim()) nextErrors.dose = 'Dose is required.';
      } else if (!testName.trim()) {
        nextErrors.testName = 'Test name is required.';
      }
    }

    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    let recorded: ConsultationRecord | null = null;
    try {
      recorded = await recordConsultation.mutateAsync({
        appointmentId,
        input: {
          notes: notes.trim(),
          outcome,
          followUpAfterDays: outcome === 'follow_up_needed' ? Number(followUpDays) : null,
        },
      });

      const referrals =
        outcome === 'referred'
          ? await createReferral.mutateAsync({
              consultationId: recorded.id,
              input: {
                targets: targets.map((target) => ({
                  targetSpecialtyId: target.targetSpecialtyId || undefined,
                  targetDoctorId: target.targetDoctorId || undefined,
                  snapshotNotes: target.snapshotNotes.trim(),
                })),
              },
            })
          : undefined;

      const issued = wantsOrder
        ? await issueOrder.mutateAsync({
            consultationId: recorded.id,
            input:
              orderType === 'prescription'
                ? {
                    orderType,
                    medication: medication.trim(),
                    dose: dose.trim(),
                    instructions: orderInstructions.trim() || null,
                  }
                : {
                    orderType,
                    testName: testName.trim(),
                    instructions: orderInstructions.trim() || null,
                  },
          })
        : undefined;

      setResult({ record: recorded, referrals, order: issued });
    } catch (error) {
      let message =
        error instanceof Error ? error.message : 'Could not record this consultation.';
      if (error instanceof ApiError) {
        if (error.status === 422 && error.code === 'REFERRAL_NO_ELIGIBLE_TARGET') {
          message = 'No eligible doctor is available for one of these targets. Nothing was created.';
        } else if (error.status === 400 && error.code === 'REFERRAL_DUPLICATE_TARGET') {
          message = 'A referral target is duplicated. Remove duplicate targets and try again.';
        } else if (error.status === 422) {
          message = 'The referral would create a loop or prohibited hop. Nothing was created.';
        } else if (error.status === 400) {
          message = 'One or more referral targets are invalid. Nothing was created.';
        }
      }
      setSubmitError(
        recorded
          ? `Consultation was recorded, but the next step failed: ${message}`
          : message,
      );
      if (recorded) setResult({ record: recorded });
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="consultation-outcome-heading">
      <h2 id="consultation-outcome-heading" className={styles.heading}>
        Outcome &amp; next steps
      </h2>

      {errors.notes ? (
        <p className={styles.error} role="alert">
          {errors.notes}
        </p>
      ) : !notes.trim() ? (
        <p className={styles.hint}>Add consultation notes above before recording an outcome.</p>
      ) : null}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Outcome</legend>
        <div className={styles.radioRow}>
          {OUTCOMES.map((option) => (
            <label key={option.value} className={styles.radioLabel}>
              <input
                type="radio"
                name="consultation-outcome"
                value={option.value}
                checked={outcome === option.value}
                onChange={() => {
                  setOutcome(option.value);
                  reset();
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {outcome === 'referred' ? (
        <div className={styles.subsection}>
          {targets.map((target, index) => (
            <ReferralTargetEditor
              key={index}
              target={target}
              index={index}
              specialties={specialtiesQuery.data ?? []}
              currentDoctorId={user?.id}
              canRemove={targets.length > 1}
              error={errors[`target-${index}`] ?? errors[`notes-${index}`]}
              onChange={(next) =>
                setTargets((current) =>
                  current.map((candidate, candidateIndex) =>
                    candidateIndex === index ? next : candidate,
                  ),
                )
              }
              onRemove={() =>
                setTargets((current) => current.filter((_, candidateIndex) => candidateIndex !== index))
              }
            />
          ))}
          {errors.targets ? <p className={styles.error} role="alert">{errors.targets}</p> : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setTargets((current) => [
                ...current,
                { targetSpecialtyId: '', targetDoctorId: '', snapshotNotes: '' },
              ])
            }
          >
            Add referral target
          </Button>
        </div>
      ) : null}

      {outcome === 'follow_up_needed' ? (
        <div className={styles.subsection}>
          <TextField
            label="Follow up in days"
            type="number"
            min={1}
            max={90}
            value={followUpDays}
            onChange={(event) => setFollowUpDays(event.target.value)}
            error={errors.followUpDays}
          />
        </div>
      ) : null}

      <div className={styles.subsection}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={wantsOrder}
            onChange={(event) => {
              setWantsOrder(event.target.checked);
              reset();
            }}
          />
          Issue a prescription or lab order with this consultation
        </label>

        {wantsOrder ? (
          <div className={styles.subsection}>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Order type</legend>
              <div className={styles.radioRow}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="consultation-order-type"
                    value="prescription"
                    checked={orderType === 'prescription'}
                    onChange={() => setOrderType('prescription')}
                  />
                  Prescription
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="consultation-order-type"
                    value="lab_order"
                    checked={orderType === 'lab_order'}
                    onChange={() => setOrderType('lab_order')}
                  />
                  Lab order
                </label>
              </div>
            </fieldset>

            {orderType === 'prescription' ? (
              <div className={styles.subsection}>
                <TextField
                  label="Medication"
                  value={medication}
                  onChange={(event) => setMedication(event.target.value)}
                  error={errors.medication}
                />
                <TextField
                  label="Dose"
                  value={dose}
                  onChange={(event) => setDose(event.target.value)}
                  error={errors.dose}
                />
              </div>
            ) : (
              <TextField
                label="Test name"
                value={testName}
                onChange={(event) => setTestName(event.target.value)}
                error={errors.testName}
              />
            )}

            <label className={styles.textareaLabel}>
              Order instructions
              <textarea
                className={styles.textarea}
                value={orderInstructions}
                onChange={(event) => setOrderInstructions(event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      {submitError ? (
        <p className={styles.error} role="alert">
          {submitError}
        </p>
      ) : null}

      {result ? (
        <div className={styles.result} role="status">
          <p>
            Consultation recorded as <strong>{OUTCOMES.find((option) => option.value === outcome)?.label}</strong>.
          </p>
          {result.referrals?.map((referral) => (
            <p key={referral.id}>
              Referral created for {referral.targetSpecialty}
              {referral.targetDoctorId ? ` → routed to doctor ${referral.targetDoctorId}` : ''}.
            </p>
          ))}
          {result.order ? <p>{result.order.medicationOrTest} issued.</p> : null}
          <Button variant="secondary" onClick={reset}>
            Record another outcome
          </Button>
        </div>
      ) : (
        <Button onClick={submit} loading={isSubmitting} disabled={!notes.trim()}>
          Record consultation
        </Button>
      )}
    </section>
  );
}
