import { useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
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
} from '../hooks/useConsultationOutcome';
import styles from './ConsultationOutcomePanel.module.css';

interface ConsultationOutcomePanelProps {
  appointmentId: string;
  notes: string;
}

interface OutcomeResult {
  record: ConsultationRecord;
  referral?: ConsultationReferral;
  order?: ConsultationIssuedOrder;
}

const OUTCOMES: { value: ConsultationOutcome; label: string }[] = [
  { value: 'resolved', label: 'Resolved' },
  { value: 'referred', label: 'Referred' },
  { value: 'follow_up_needed', label: 'Follow-up needed' },
];

export function ConsultationOutcomePanel({ appointmentId, notes }: ConsultationOutcomePanelProps) {
  const recordConsultation = useRecordConsultation();
  const createReferral = useCreateConsultationReferral();
  const issueOrder = useIssueConsultationOrder();

  const [outcome, setOutcome] = useState<ConsultationOutcome>('resolved');
  const [followUpDays, setFollowUpDays] = useState('7');
  const [specialty, setSpecialty] = useState('');
  const [referralReason, setReferralReason] = useState('');
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
      if (!specialty.trim()) nextErrors.specialty = 'Target specialty is required.';
      if (!referralReason.trim()) nextErrors.referralReason = 'Referral reason is required.';
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

      const referral =
        outcome === 'referred'
          ? await createReferral.mutateAsync({
              consultationId: recorded.id,
              input: { targetSpecialty: specialty.trim(), reason: referralReason.trim() },
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

      setResult({ record: recorded, referral, order: issued });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not record this consultation.';
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
          <TextField
            label="Target specialty"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            error={errors.specialty}
          />
          <label className={styles.textareaLabel}>
            Referral reason
            <textarea
              className={styles.textarea}
              value={referralReason}
              onChange={(event) => setReferralReason(event.target.value)}
              aria-invalid={Boolean(errors.referralReason)}
            />
          </label>
          {errors.referralReason ? (
            <p className={styles.error} role="alert">
              {errors.referralReason}
            </p>
          ) : null}
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
          {result.referral ? <p>Referral created for {result.referral.targetSpecialty}.</p> : null}
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
