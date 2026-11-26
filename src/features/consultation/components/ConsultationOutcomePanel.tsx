import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { ApiError } from '../../../services/api-client';
import { useAppointment } from '../../appointment/hooks/useAppointment';
import type {
  ConsultationOutcome,
  IssuedLabOrder,
  IssuedPrescription,
  ConsultationLabOrder,
  ConsultationPrescription,
  ConsultationReferral,
} from '../../../types/models';
import {
  useConsultationForAppointment,
  useCreateConsultation,
  useMyDoctorProfile,
} from '../hooks/useConsultationOrders';
import {
  useCreateConsultationReferral,
  useReferralDoctors,
  useReferralSpecialties,
} from '../hooks/useConsultationOutcome';
import { formatStroops } from '../../../services/payments-service';
import { LabOrderForm, PrescriptionForm } from './OrderForms';
import styles from './ConsultationOutcomePanel.module.css';

const OUTCOME_LABELS: Record<ConsultationOutcome, string> = {
  resolved: 'Resolved',
  referred: 'Referred',
  follow_up_needed: 'Follow-up needed',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ReferralTargetDraft {
  key: number;
  targetSpecialtyId: string;
  targetDoctorId: string;
  snapshotNotes: string;
}

let nextTargetKey = 1;

function newReferralTarget(): ReferralTargetDraft {
  return {
    key: nextTargetKey++,
    targetSpecialtyId: '',
    targetDoctorId: '',
    snapshotNotes: '',
  };
}

interface ReferralValidation {
  message: string;
  targetKey?: number;
  field?: 'specialty' | 'notes';
}

/** Mirrors the server's atomic batch rules (issue #266) before any request. */
function validateReferralTargets(targets: ReferralTargetDraft[]): ReferralValidation | null {
  if (targets.length === 0) {
    return { message: 'Add at least one referral target.' };
  }

  for (const target of targets) {
    if (!target.targetSpecialtyId && !target.targetDoctorId) {
      return {
        message: 'Each referral target needs a specialty or a doctor.',
        targetKey: target.key,
        field: 'specialty',
      };
    }
    if (!target.snapshotNotes.trim()) {
      return {
        message: 'Snapshot notes are required for every referral target.',
        targetKey: target.key,
        field: 'notes',
      };
    }
  }

  const keys = targets.map((target) =>
    target.targetDoctorId
      ? `doctor:${target.targetDoctorId}`
      : `specialty:${target.targetSpecialtyId}`,
  );
  if (new Set(keys).size !== keys.length) {
    return { message: 'Remove duplicate referral targets.' };
  }

  return null;
}

function referralErrorCopy(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.code === 'REFERRAL_DUPLICATE_TARGET') {
      return 'One or more targets are duplicated or invalid. Remove duplicate targets and try again.';
    }
    if (error.status === 422) {
      return error.code === 'REFERRAL_NO_ELIGIBLE_TARGET'
        ? 'No eligible doctor could be found for one of these specialties. Choose a specific doctor or try again later.'
        : 'One of these referrals breaks the routing rules. Check the specialty, doctor, and referral limits.';
    }
    if (error.message.trim()) return error.message;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'The referrals could not be created. Try again.';
}

function ReferralTargetRow({
  index,
  target,
  specialties,
  currentDoctorId,
  canRemove,
  validation,
  onChange,
  onRemove,
}: {
  index: number;
  target: ReferralTargetDraft;
  specialties: { id: string; name: string }[];
  currentDoctorId?: string | null;
  canRemove: boolean;
  validation: ReferralValidation | null;
  onChange: (patch: Partial<ReferralTargetDraft>) => void;
  onRemove: () => void;
}) {
  const doctorsQuery = useReferralDoctors(target.targetSpecialtyId || null);
  const eligibleDoctors = (doctorsQuery.data ?? []).filter(
    (doctor) => doctor.verificationStatus === 'verified' && doctor.id !== currentDoctorId,
  );
  const specialtyInvalid =
    validation?.targetKey === target.key && validation.field === 'specialty';
  const notesInvalid = validation?.targetKey === target.key && validation.field === 'notes';

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Referral target {index + 1}</legend>

      <div className={styles.field}>
        <label htmlFor={`referral-${target.key}-specialty`} className={styles.label}>
          Target specialty
        </label>
        <select
          id={`referral-${target.key}-specialty`}
          className={styles.select}
          value={target.targetSpecialtyId}
          aria-invalid={specialtyInvalid}
          onChange={(event) =>
            onChange({ targetSpecialtyId: event.target.value, targetDoctorId: '' })
          }
        >
          <option value="">Choose a specialty</option>
          {specialties.map((specialty) => (
            <option key={specialty.id} value={specialty.id}>
              {specialty.name}
            </option>
          ))}
        </select>
        {specialties.length === 0 ? (
          <p className={styles.hint}>No specialties are available to refer to yet.</p>
        ) : null}
      </div>

      {target.targetSpecialtyId ? (
        <div className={styles.field}>
          <label htmlFor={`referral-${target.key}-doctor`} className={styles.label}>
            Optional doctor
          </label>
          <select
            id={`referral-${target.key}-doctor`}
            className={styles.select}
            value={target.targetDoctorId}
            onChange={(event) => onChange({ targetDoctorId: event.target.value })}
          >
            <option value="">Any eligible doctor</option>
            {eligibleDoctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName}
              </option>
            ))}
          </select>
          {doctorsQuery.isError ? (
            <p className={styles.hint} role="status">
              Couldn’t load doctors for this specialty. The referral can still be
              sent to any eligible doctor.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor={`referral-${target.key}-notes`} className={styles.label}>
          Snapshot notes
        </label>
        <textarea
          id={`referral-${target.key}-notes`}
          className={styles.textarea}
          value={target.snapshotNotes}
          aria-invalid={notesInvalid}
          onChange={(event) => onChange({ snapshotNotes: event.target.value })}
          rows={3}
          maxLength={20000}
          placeholder="Why this patient is being referred (PHI — kept out of logs and analytics)"
        />
      </div>

      {canRemove ? (
        <Button type="button" variant="secondary" onClick={onRemove}>
          Remove target {index + 1}
        </Button>
      ) : null}
    </fieldset>
  );
}

function IssuedOrders({
  issued,
  patientProfileId,
}: {
  issued: (IssuedPrescription | IssuedLabOrder)[];
  patientProfileId?: string;
}) {
  if (issued.length === 0) return null;

  return (
    <section className={styles.issued} aria-labelledby="issued-orders-heading">
      <h3 id="issued-orders-heading">Issued this session</h3>
      <ul className={styles.issuedList}>
        {issued.map((order) => {
          const isPrescription = 'items' in order;
          return (
            <li key={order.id} className={styles.issuedCard} id={`issued-order-${order.id}`}>
              <div className={styles.issuedHeader}>
                <p className={styles.issuedTitle}>
                  {isPrescription ? 'Prescription' : 'Lab order'} ·{' '}
                  {isPrescription
                    ? order.items.map((item) => item.drugName).join(', ')
                    : (order as ConsultationLabOrder).testType}
                </p>
                <span className={styles.statusPill}>{order.status}</span>
              </div>
              <p className={styles.issuedMeta}>
                Issued {formatDateTime(order.createdAt)} ·{' '}
                {formatStroops(order.amountStroops, 'XLM')} · Payment intent{' '}
                {order.paymentIntent.status}
              </p>

              <details className={styles.details}>
                <summary>View order details</summary>
                <dl className={styles.detailList}>
                  <dt>Order ID</dt>
                  <dd className={styles.mono}>{order.id}</dd>
                  <dt>Facility</dt>
                  <dd className={styles.mono}>{order.facilityProfileId}</dd>
                  <dt>Amount (stroops)</dt>
                  <dd className={styles.mono}>{order.amountStroops}</dd>
                  {isPrescription ? (
                    <>
                      <dt>Medications</dt>
                      <dd>
                        <ol className={styles.itemList}>
                          {(order as ConsultationPrescription).items.map((item) => (
                            <li key={item.id}>
                              {item.drugName} — {item.dosage}, {item.frequency}, for{' '}
                              {item.duration}
                            </li>
                          ))}
                        </ol>
                      </dd>
                    </>
                  ) : (
                    <>
                      <dt>Urgency</dt>
                      <dd>{(order as ConsultationLabOrder).urgency}</dd>
                      <dt>Instructions</dt>
                      <dd>{(order as ConsultationLabOrder).notes || 'None'}</dd>
                    </>
                  )}
                </dl>
              </details>

              <p className={styles.issuedNote}>
                Orders are append-only. To correct one, issue a superseding order
                from this consultation — issued orders can’t be edited.
              </p>

              {patientProfileId && (
                <Link
                  className={styles.issuedLink}
                  to={`/doctor/patient-chart/${patientProfileId}`}
                >
                  Open this patient’s chart
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CreatedReferrals({ referrals }: { referrals: ConsultationReferral[] }) {
  if (referrals.length === 0) return null;

  return (
    <section className={styles.issued} aria-labelledby="referrals-created-heading">
      <h3 id="referrals-created-heading">Referrals created</h3>
      <ul className={styles.issuedList}>
        {referrals.map((referral) => (
          <li key={referral.id} className={styles.issuedCard}>
            <div className={styles.issuedHeader}>
              <p className={styles.issuedTitle}>Referral to {referral.targetSpecialty}</p>
              <span className={styles.statusPill}>{referral.status}</span>
            </div>
            {referral.reason ? <p className={styles.issuedMeta}>{referral.reason}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ConsultationOutcomePanelProps {
  appointmentId: string;
}

/**
 * The consultation's outcome + order issuance (issues #7/#267) and atomic
 * multi-target referrals (issue #266). Closing the visit creates
 * docforum-core's consultation (`POST /orders/consultations`); referrals are
 * then sent as one batch through `POST /consultations/:id/referrals`, and
 * prescriptions/lab orders are issued against the same consultation id.
 */
export function ConsultationOutcomePanel({ appointmentId }: ConsultationOutcomePanelProps) {
  const consultationQuery = useConsultationForAppointment(appointmentId);
  const consultation = consultationQuery.data ?? null;
  const createConsultation = useCreateConsultation(appointmentId);
  const createReferral = useCreateConsultationReferral();
  const doctorProfile = useMyDoctorProfile();
  const appointment = useAppointment(appointmentId);
  const specialtiesQuery = useReferralSpecialties();

  const [outcome, setOutcome] = useState<ConsultationOutcome>('resolved');
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState<'prescription' | 'lab_order'>('prescription');
  const [issued, setIssued] = useState<(IssuedPrescription | IssuedLabOrder)[]>([]);
  const [targets, setTargets] = useState<ReferralTargetDraft[]>([newReferralTarget()]);
  const [validation, setValidation] = useState<ReferralValidation | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ConsultationReferral[]>([]);

  const patientProfileId = appointment.data?.patientProfileId;
  const currentDoctorId = doctorProfile.data?.id;
  const verificationStatus = doctorProfile.data?.verificationStatus;
  const isUnverified = verificationStatus != null && verificationStatus !== 'verified';

  const focusValidation = (next: ReferralValidation) => {
    if (next.targetKey === undefined || !next.field) return;
    const id = `referral-${next.targetKey}-${next.field}`;
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  const checkReferralTargets = () => {
    const next = validateReferralTargets(targets);
    setValidation(next);
    if (next) focusValidation(next);
    return next === null;
  };

  const submitReferrals = async (consultationId: string) => {
    if (!checkReferralTargets()) return;
    setReferralError(null);
    try {
      const created = await createReferral.mutateAsync({
        consultationId,
        input: {
          targets: targets.map((target) => ({
            targetSpecialtyId: target.targetSpecialtyId || undefined,
            targetDoctorId: target.targetDoctorId || undefined,
            snapshotNotes: target.snapshotNotes.trim(),
          })),
        },
      });
      setReferrals(created);
    } catch (error) {
      setReferralError(referralErrorCopy(error));
    }
  };

  const handleCloseVisit = async (event: FormEvent) => {
    event.preventDefault();
    setReferralError(null);

    // Validate before closing: referrals are part of the same submission, and
    // a consultation can only be closed once (#266/#267).
    if (outcome === 'referred' && !checkReferralTargets()) return;

    try {
      const created = await createConsultation.mutateAsync({
        outcome,
        notes: notes.trim() ? notes.trim() : null,
      });
      setNotes('');
      if (outcome === 'referred') {
        await submitReferrals(created.id);
      }
    } catch {
      // Surfaced from the mutation's error state below.
    }
  };

  const conflict =
    createConsultation.error instanceof ApiError && createConsultation.error.status === 409;

  return (
    <section className={styles.panel} aria-labelledby="consultation-outcome-heading">
      <header className={styles.header}>
        <div>
          <h2 id="consultation-outcome-heading">Outcome and orders</h2>
          <p className={styles.subtitle}>
            Close the consultation once, then issue prescriptions, lab orders or
            referrals against it.
          </p>
        </div>
      </header>

      {isUnverified && (
        <div className={styles.notice} role="status">
          <p className={styles.noticeTitle}>
            This profile is {verificationStatus === 'rejected' ? 'not verified' : 'still pending verification'}
          </p>
          <p>
            docforum-core only lets verified doctors issue orders. You can close
            the consultation, but prescriptions and lab orders will be rejected
            until verification is complete.
          </p>
          <Link className={styles.alertLink} to="/doctor/verification">
            Check verification status
          </Link>
        </div>
      )}

      {!consultation ? (
        <form className={styles.form} onSubmit={handleCloseVisit} noValidate>
          <div className={styles.field}>
            <label htmlFor="consultation-outcome" className={styles.label}>
              Consultation outcome
            </label>
            <select
              id="consultation-outcome"
              className={styles.select}
              value={outcome}
              onChange={(event) => {
                setOutcome(event.target.value as ConsultationOutcome);
                setValidation(null);
              }}
            >
              {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="consultation-notes" className={styles.label}>
              Outcome notes (clinical, stored encrypted)
            </label>
            <textarea
              id="consultation-notes"
              className={styles.textarea}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={20000}
              placeholder="Optional summary of the visit (PHI — kept out of logs and analytics)"
            />
          </div>

          {outcome === 'referred' ? (
            <div>
              <p className={styles.hint}>
                One batch creates every referral atomically. Choose a specialty,
                optionally a specific doctor, and add snapshot notes for each target.
              </p>
              {targets.map((target, index) => (
                <ReferralTargetRow
                  key={target.key}
                  index={index}
                  target={target}
                  specialties={specialtiesQuery.data ?? []}
                  currentDoctorId={currentDoctorId}
                  canRemove={targets.length > 1}
                  validation={validation}
                  onChange={(patch) =>
                    setTargets((current) =>
                      current.map((row) =>
                        row.key === target.key ? { ...row, ...patch } : row,
                      ),
                    )
                  }
                  onRemove={() =>
                    setTargets((current) => current.filter((row) => row.key !== target.key))
                  }
                />
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTargets((current) => [...current, newReferralTarget()])}
              >
                Add referral target
              </Button>
            </div>
          ) : null}

          {validation ? (
            <p className={styles.error} role="alert">
              {validation.message}
            </p>
          ) : null}

          {createConsultation.isError && !conflict && (
            <p className={styles.error} role="alert">
              {createConsultation.error instanceof Error
                ? createConsultation.error.message
                : 'The consultation could not be closed.'}
            </p>
          )}
          {conflict && (
            <p className={styles.error} role="alert">
              This visit already has a consultation — it can only be closed once.
              Ask an admin to check the record if you need to correct the outcome.
            </p>
          )}

          <Button type="submit" loading={createConsultation.isPending}>
            Close consultation
          </Button>
        </form>
      ) : (
        <>
          <div className={styles.closedSummary}>
            <p>
              <strong>Consultation closed</strong> · {OUTCOME_LABELS[consultation.outcome ?? 'resolved']}{' '}
              · {formatDateTime(consultation.createdAt)}
            </p>
            <p className={styles.mono}>Consultation ID {consultation.id}</p>
          </div>

          {outcome === 'referred' && referrals.length === 0 ? (
            <div className={styles.alert} role={referralError ? 'alert' : 'status'}>
              <p className={styles.alertTitle}>
                {referralError ? 'Referrals not created' : 'Creating referrals…'}
              </p>
              {referralError ? (
                <>
                  <p>{referralError}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={createReferral.isPending}
                    onClick={() => void submitReferrals(consultation.id)}
                  >
                    Retry referrals
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}

          <CreatedReferrals referrals={referrals} />

          <div className={styles.tabs} role="tablist" aria-label="Order type">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'prescription'}
              className={tab === 'prescription' ? styles.tabActive : styles.tab}
              onClick={() => setTab('prescription')}
            >
              Prescription
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'lab_order'}
              className={tab === 'lab_order' ? styles.tabActive : styles.tab}
              onClick={() => setTab('lab_order')}
            >
              Lab order
            </button>
          </div>

          <div role="tabpanel">
            {tab === 'prescription' ? (
              <PrescriptionForm
                consultationId={consultation.id}
                onIssued={(order) => setIssued((current) => [...current, order])}
              />
            ) : (
              <LabOrderForm
                consultationId={consultation.id}
                onIssued={(order) => setIssued((current) => [...current, order])}
              />
            )}
          </div>

          <IssuedOrders issued={issued} patientProfileId={patientProfileId} />
        </>
      )}
    </section>
  );
}
