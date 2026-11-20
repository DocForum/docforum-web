import { Link } from 'react-router-dom';
import { QueryState } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { ApiError } from '../../../services/api-client';
import { useReferralDetail } from '../hooks/useReferralDetail';
import type { AppointmentStatus } from '../../../types/models';
import { ReferralAccessDenied } from './ReferralAccessDenied';
import { ReferralStatusPill } from './ReferralStatusPill';
import { SnapshotContextViewer } from './SnapshotContextViewer';
import styles from './ReferralDetailPage.module.css';

const APPOINTMENT_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  checked_in: 'Checked in',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Did not attend',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ReferralDetailPage({ referralId }: { referralId: string }) {
  const referralQuery = useReferralDetail(referralId);
  const errorText = useErrorMessage();

  // 403/404 is the documented "reassigned to another specialist" state — it
  // gets the explained access-denied screen, not a generic error.
  if (
    referralQuery.error instanceof ApiError &&
    (referralQuery.error.status === 403 || referralQuery.error.status === 404)
  ) {
    return <ReferralAccessDenied reason={referralQuery.error.status === 403 ? 'forbidden' : 'not_found'} />;
  }

  return (
    <QueryState
      result={referralQuery}
      errorLayout="page"
      errorTitle="This referral couldn't be loaded"
      errorMessage={(error) => errorText(error) ?? 'This referral could not be loaded. Try again.'}
      fallback={{ label: 'Back to referrals', to: '/doctor/referrals' }}
      loading={<Skeleton lines={6} label="Loading referral" />}
    >
      {(referral) => (
        <div className={styles.root}>
          <Link className={styles.backLink} to="/doctor/referrals">
            Back to referrals
          </Link>

          <div className={styles.header}>
            <h1 className={styles.heading}>Referral from {referral.referringDoctor.fullName}</h1>
            <ReferralStatusPill status={referral.status} />
          </div>

          <SnapshotContextViewer referral={referral} />

          {referral.resultingAppointmentId && referral.appointment ? (
            <section className={styles.appointment} aria-labelledby="appointment-heading">
              <h2 id="appointment-heading" className={styles.appointmentHeading}>
                Resulting appointment
              </h2>
              <p className={styles.appointmentStatus}>
                {APPOINTMENT_LABELS[referral.appointment.status]}
                {referral.appointment.status === 'scheduled' ? (
                  <>
                    {' · '}
                    <time dateTime={referral.updatedAt}>{formatDate(referral.updatedAt)}</time>
                  </>
                ) : null}
              </p>
              {/* The slot's exact date/time lives on the appointment screen
                  (issue #6) — the referral payload only freezes when the
                  appointment was linked, so we show that and link over rather
                  than fetching appointment data here. */}
              <Link className={styles.appointmentLink} to={`/doctor/appointments/${referral.resultingAppointmentId}`}>
                View appointment
              </Link>
            </section>
          ) : null}
        </div>
      )}
    </QueryState>
  );
}
