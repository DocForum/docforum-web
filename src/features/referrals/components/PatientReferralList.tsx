import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { FormError } from '../../../components/FormError';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { ApiError } from '../../../services/api-client';
import type { AcceptReferralResult, PatientReferral, ReferralStatus } from '../../../types/models';
import {
  useAcceptReferral,
  useDeclineReferral,
  usePatientReferrals,
} from '../hooks/usePatientReferrals';
import styles from './PatientReferralList.module.css';

const STATUS_LABEL: Record<ReferralStatus, string> = {
  pending: 'Waiting for your answer',
  accepted: 'Accepted — appointment booked',
  declined: 'Declined',
  completed: 'Completed',
  expired: 'Expired',
};

function formatAppointment(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AppointmentCreatedPanel({ result }: { result: AcceptReferralResult }) {
  const { appointment } = result;

  return (
    <div className={styles.created} role="status" aria-live="polite">
      <h2 className={styles.createdHeading}>Appointment booked</h2>
      <p>
        Your referral was accepted and DocForum created an appointment with{' '}
        <strong>{appointment.doctorName}</strong> for <strong>{formatAppointment(appointment.startsAt)}</strong>.
      </p>
      <p className={styles.createdNote}>
        You don’t need to re-enter your details — your referral and intake are already on the
        appointment.
      </p>
      <div className={styles.createdActions}>
        <Link className={styles.primaryLink} to={`/appointments/${appointment.id}`}>
          View the appointment
        </Link>
        {appointment.requiresIntake && (
          <Link
            className={styles.secondaryLink}
            to={`/patient/appointments/${appointment.id}/intake`}
          >
            Finish your intake
          </Link>
        )}
      </div>
    </div>
  );
}

function ReferralCard({
  referral,
  onAccept,
  onDecline,
}: {
  referral: PatientReferral;
  onAccept: (referral: PatientReferral) => void;
  onDecline: (referral: PatientReferral) => void;
}) {
  const isPending = referral.status === 'pending';

  return (
    <li className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.specialty}>{referral.targetSpecialty.name}</h3>
          <p className={styles.referrer}>
            Referred by {referral.referringDoctor.fullName}
          </p>
        </div>
        <span className={`${styles.status} ${isPending ? styles.statusPending : ''}`}>
          {STATUS_LABEL[referral.status]}
        </span>
      </div>

      {referral.referralNote && <p className={styles.note}>{referral.referralNote}</p>}

      {referral.targetDoctor && (
        <p className={styles.detail}>You’ll be seen by {referral.targetDoctor.fullName}.</p>
      )}

      {referral.appointment && (
        <p className={styles.detail}>
          Appointment: <strong>{formatAppointment(referral.appointment.startsAt)}</strong>
        </p>
      )}

      {isPending ? (
        <div className={styles.actions}>
          <Button onClick={() => onAccept(referral)}>
            Accept and book appointment
          </Button>
          <Button variant="secondary" onClick={() => onDecline(referral)}>
            Decline
          </Button>
        </div>
      ) : (
        <Link className={styles.cardLink} to="/patient/referrals">
          {referral.appointment ? 'View appointment details' : 'No action needed'}
        </Link>
      )}
    </li>
  );
}

/**
 * Patient-facing referral screen (issue #4, PRD OQ-3). A referral is never
 * auto-booked: the patient sees it, and only accepting creates the
 * appointment. Accepting is confirmed in advance ("this books an
 * appointment") and confirmed again afterwards ("an appointment was
 * created", with its date and a link), so the value prop — no re-entering
 * intake — is visible rather than implied by a status pill.
 */
export function PatientReferralList() {
  const query = usePatientReferrals();
  const acceptMutation = useAcceptReferral();
  const declineMutation = useDeclineReferral();
  const errorMessage = useErrorMessage();

  const [confirm, setConfirm] = useState<{ action: 'accept' | 'decline'; referral: PatientReferral } | null>(
    null,
  );
  const [accepted, setAccepted] = useState<AcceptReferralResult | null>(null);
  const [declined, setDeclined] = useState(false);

  if (query.isPending) {
    return <Skeleton lines={4} label="Loading your referrals" />;
  }

  if (query.isError) {
    return (
      <InlineError
        title="Your referrals couldn’t be loaded"
        message={queryErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const referrals = query.data?.items ?? [];
  const pending = referrals.filter((referral) => referral.status === 'pending');
  const answered = referrals.filter((referral) => referral.status !== 'pending');

  if (referrals.length === 0) {
    return (
      <EmptyState
        title="No referrals waiting for you"
        description="When a doctor refers you to a specialist, it appears here for you to accept or decline. Nothing is booked until you say so."
        action={{ label: 'Find a doctor', to: '/patient/search' }}
      />
    );
  }

  const confirmIsAccept = confirm?.action === 'accept';
  const activeMutation = confirmIsAccept ? acceptMutation : declineMutation;

  function closeConfirm() {
    setConfirm(null);
    acceptMutation.reset();
    declineMutation.reset();
  }

  function handleConfirm() {
    if (!confirm) return;
    const { action, referral } = confirm;

    if (action === 'accept') {
      acceptMutation.mutate(referral.id, {
        onSuccess: (result) => {
          setConfirm(null);
          setAccepted(result);
          setDeclined(false);
        },
      });
      return;
    }

    declineMutation.mutate(referral.id, {
      onSuccess: () => {
        setConfirm(null);
        setDeclined(true);
        setAccepted(null);
      },
    });
  }

  const conflict =
    activeMutation.error instanceof ApiError &&
    (activeMutation.error.status === 409 || activeMutation.error.status === 404);

  return (
    <div className={styles.root}>
      {accepted && <AppointmentCreatedPanel result={accepted} />}

      {declined && (
        <p className={styles.declinedNotice} role="status">
          Referral declined. Your doctor has been told. If you change your mind, ask them to send a
          new referral.
        </p>
      )}

      {pending.length > 0 && (
        <section aria-labelledby="pending-referrals">
          <h2 id="pending-referrals" className={styles.heading}>
            Waiting for your answer
          </h2>
          <ul className={styles.list}>
            {pending.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                onAccept={(item) => {
                  acceptMutation.reset();
                  declineMutation.reset();
                  setAccepted(null);
                  setDeclined(false);
                  setConfirm({ action: 'accept', referral: item });
                }}
                onDecline={(item) => {
                  acceptMutation.reset();
                  declineMutation.reset();
                  setConfirm({ action: 'decline', referral: item });
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {answered.length > 0 && (
        <section aria-labelledby="answered-referrals">
          <h2 id="answered-referrals" className={styles.heading}>
            Already answered
          </h2>
          <ul className={styles.list}>
            {answered.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                onAccept={() => undefined}
                onDecline={() => undefined}
              />
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={confirm !== null}
        onClose={closeConfirm}
        labelledBy="referral-confirm-heading"
        describedBy="referral-confirm-body"
        overlayClassName={styles.overlay}
        panelClassName={styles.dialog}
      >
        {confirm && (
          <>
            <h2 id="referral-confirm-heading" className={styles.dialogHeading}>
              {confirmIsAccept
                ? `Accept the referral to ${confirm.referral.targetSpecialty.name}?`
                : `Decline the referral to ${confirm.referral.targetSpecialty.name}?`}
            </h2>
            <p id="referral-confirm-body" className={styles.dialogBody}>
              {confirmIsAccept
                ? 'Accepting books an appointment with the specialist for you. Your referral details and intake go with it, so you won’t have to enter them again. You’ll see the appointment date next.'
                : 'Declining closes this referral. No appointment is booked, and your doctor will be told. You can ask them for a new referral later.'}
            </p>

            <FormError
              message={
                conflict
                  ? 'Someone already answered this referral. Close this and refresh to see its current state.'
                  : errorMessage(activeMutation.error)
              }
            />

            <div className={styles.dialogActions}>
              <Button
                onClick={handleConfirm}
                loading={activeMutation.isPending}
                variant={confirmIsAccept ? 'primary' : 'danger'}
              >
                {confirmIsAccept ? 'Accept and book appointment' : 'Decline referral'}
              </Button>
              <Button variant="secondary" onClick={closeConfirm} disabled={activeMutation.isPending}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
