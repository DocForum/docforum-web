import { useEffect, useRef, useState } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { FormField } from '../../../components/form/FormField';
import { useZodForm } from '../../../hooks/useZodForm';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { mapServerErrors } from '../../../utils/form';
import { ApiError } from '../../../services/api-client';
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
import {
  consultationOutcomeDefaults,
  consultationOutcomeSchema,
  type ConsultationOutcomeFormData,
} from '../outcome-schema';
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
  const errorMessage = useErrorMessage();

  const form = useZodForm(consultationOutcomeSchema, consultationOutcomeDefaults);
  const { errors } = form.formState;
  const outcome = form.watch('outcome');
  const wantsOrder = form.watch('wantsOrder');
  const orderType = form.watch('orderType');

  // The record is kept here between attempts so that a failure in the
  // referral/order step can be retried without recording the consultation
  // twice (issue #286).
  const recordedRef = useRef<ConsultationRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<OutcomeResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first invalid field after a failed submit, in DOM order.
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [errors]);

  const isSubmitting =
    recordConsultation.isPending || createReferral.isPending || issueOrder.isPending;

  const clearAttemptState = () => {
    setResult(null);
    setSubmitError(null);
    form.clearErrors();
  };

  const onSubmit = async (data: ConsultationOutcomeFormData) => {
    setSubmitError(null);
    try {
      const recorded =
        recordedRef.current ??
        (await recordConsultation.mutateAsync({
          appointmentId,
          input: {
            notes: notes.trim(),
            outcome: data.outcome,
            followUpAfterDays:
              data.outcome === 'follow_up_needed' ? Number(data.followUpDays) : null,
          },
        }));
      recordedRef.current = recorded;

      const referral =
        data.outcome === 'referred'
          ? await createReferral.mutateAsync({
              consultationId: recorded.id,
              input: {
                targetSpecialty: data.specialty.trim(),
                reason: data.referralReason.trim(),
              },
            })
          : undefined;

      const issued = data.wantsOrder
        ? await issueOrder.mutateAsync({
            consultationId: recorded.id,
            input:
              data.orderType === 'prescription'
                ? {
                    orderType: 'prescription',
                    medication: data.medication.trim(),
                    dose: data.dose.trim(),
                    instructions: data.orderInstructions.trim() || null,
                  }
                : {
                    orderType: 'lab_order',
                    testName: data.testName.trim(),
                    instructions: data.orderInstructions.trim() || null,
                  },
          })
        : undefined;

      recordedRef.current = null;
      setResult({ record: recorded, referral, order: issued });
    } catch (error) {
      const message = errorMessage(error) ?? 'Could not record this consultation.';

      // A failure after the record was saved is a partial success: say so and
      // leave the form available so the remaining step can be retried.
      if (recordedRef.current) {
        setSubmitError(`Consultation was recorded, but the next step failed: ${message}`);
        return;
      }

      if (error instanceof ApiError) {
        const fieldErrors = mapServerErrors(error.body);
        const entries = Object.entries(fieldErrors);
        if (entries.length > 0) {
          entries.forEach(([field, fieldMessage]) => {
            form.setError(field as keyof ConsultationOutcomeFormData, {
              message: fieldMessage,
            });
          });
          form.setFocus(entries[0][0] as keyof ConsultationOutcomeFormData);
          return;
        }
      }

      setSubmitError(message);
    }
  };

  const recordAnother = () => {
    recordedRef.current = null;
    form.reset(consultationOutcomeDefaults);
    setResult(null);
    setSubmitError(null);
  };

  return (
    <FormProvider {...form}>
      <section className={styles.panel} aria-labelledby="consultation-outcome-heading">
        <h2 id="consultation-outcome-heading" className={styles.heading}>
          Outcome &amp; next steps
        </h2>

        {!notes.trim() ? (
          <p className={styles.hint}>Add consultation notes above before recording an outcome.</p>
        ) : null}

        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <Controller
            control={form.control}
            name="outcome"
            render={({ field }) => (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Outcome</legend>
                <div className={styles.radioRow}>
                  {OUTCOMES.map((option) => (
                    <label key={option.value} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name={field.name}
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={() => {
                          field.onChange(option.value);
                          clearAttemptState();
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          />

          {outcome === 'referred' ? (
            <div className={styles.subsection}>
              <FormField name="specialty" label="Target specialty" />
              <label className={styles.textareaLabel}>
                Referral reason
                <textarea
                  id="referral-reason"
                  className={styles.textarea}
                  aria-invalid={Boolean(errors.referralReason)}
                  aria-describedby={
                    errors.referralReason ? 'referral-reason-error' : undefined
                  }
                  {...form.register('referralReason')}
                />
              </label>
              {errors.referralReason ? (
                <p id="referral-reason-error" className={styles.error} role="alert">
                  {errors.referralReason.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {outcome === 'follow_up_needed' ? (
            <div className={styles.subsection}>
              <FormField
                name="followUpDays"
                label="Follow up in days"
                type="number"
                min={1}
                max={90}
                inputMode="numeric"
              />
            </div>
          ) : null}

          <div className={styles.subsection}>
            <Controller
              control={form.control}
              name="wantsOrder"
              render={({ field }) => (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={field.value}
                    onChange={(event) => {
                      field.onChange(event.target.checked);
                      clearAttemptState();
                    }}
                  />
                  Issue a prescription or lab order with this consultation
                </label>
              )}
            />

            {wantsOrder ? (
              <div className={styles.subsection}>
                <Controller
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <fieldset className={styles.fieldset}>
                      <legend className={styles.legend}>Order type</legend>
                      <div className={styles.radioRow}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name={field.name}
                            value="prescription"
                            checked={field.value === 'prescription'}
                            onChange={() => {
                              field.onChange('prescription');
                              clearAttemptState();
                            }}
                          />
                          Prescription
                        </label>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name={field.name}
                            value="lab_order"
                            checked={field.value === 'lab_order'}
                            onChange={() => {
                              field.onChange('lab_order');
                              clearAttemptState();
                            }}
                          />
                          Lab order
                        </label>
                      </div>
                    </fieldset>
                  )}
                />

                {orderType === 'prescription' ? (
                  <div className={styles.subsection}>
                    <FormField name="medication" label="Medication" />
                    <FormField name="dose" label="Dose" />
                  </div>
                ) : (
                  <FormField name="testName" label="Test name" />
                )}

                <label className={styles.textareaLabel}>
                  Order instructions
                  <textarea
                    id="order-instructions"
                    className={styles.textarea}
                    {...form.register('orderInstructions')}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <FormError message={submitError} />

          {result ? (
            <div className={styles.result} role="status">
              <p>
                Consultation recorded as{' '}
                <strong>
                  {OUTCOMES.find((option) => option.value === result.record.outcome)?.label}
                </strong>
                .
              </p>
              {result.referral ? (
                <p>Referral created for {result.referral.targetSpecialty}.</p>
              ) : null}
              {result.order ? <p>{result.order.medicationOrTest} issued.</p> : null}
              <Button type="button" variant="secondary" onClick={recordAnother}>
                Record another outcome
              </Button>
            </div>
          ) : (
            <Button type="submit" loading={isSubmitting} disabled={!notes.trim()}>
              Record consultation
            </Button>
          )}
        </form>
      </section>
    </FormProvider>
  );
}
