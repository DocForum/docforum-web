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
} from '../../../types/models';
import {
  useConsultationForAppointment,
  useCreateConsultation,
  useMyDoctorProfile,
} from '../hooks/useConsultationOrders';
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

interface ConsultationOutcomePanelProps {
  appointmentId: string;
}

/**
 * The consultation's outcome + order issuance (issues #7/#267). Closing the
 * visit creates docforum-core's consultation (`POST /orders/consultations`);
 * prescriptions and lab orders are then issued against that consultation id
 * through the real `/orders/consultations/:id/...` endpoints.
 */
export function ConsultationOutcomePanel({ appointmentId }: ConsultationOutcomePanelProps) {
  const consultationQuery = useConsultationForAppointment(appointmentId);
  const consultation = consultationQuery.data ?? null;
  const createConsultation = useCreateConsultation(appointmentId);
  const doctorProfile = useMyDoctorProfile();
  const appointment = useAppointment(appointmentId);

  const [outcome, setOutcome] = useState<ConsultationOutcome>('resolved');
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState<'prescription' | 'lab_order'>('prescription');
  const [issued, setIssued] = useState<(IssuedPrescription | IssuedLabOrder)[]>([]);

  const patientProfileId = appointment.data?.patientProfileId;
  const verificationStatus = doctorProfile.data?.verificationStatus;
  const isUnverified = verificationStatus != null && verificationStatus !== 'verified';

  const handleCloseVisit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createConsultation.mutateAsync({
        outcome,
        notes: notes.trim() ? notes.trim() : null,
      });
      setNotes('');
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
            Close the consultation once, then issue prescriptions and lab orders
            against it.
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
              onChange={(event) => setOutcome(event.target.value as ConsultationOutcome)}
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
