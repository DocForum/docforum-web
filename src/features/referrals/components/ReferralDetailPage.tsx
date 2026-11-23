import { Link } from 'react-router-dom';
import { QueryState } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useT, type Translate } from '../../../i18n/useT';
import { ApiError } from '../../../services/api-client';
import { useReferralDetail } from '../hooks/useReferralDetail';
import type { AppointmentStatus } from '../../../types/models';
import { ReferralAccessDenied } from './ReferralAccessDenied';
import { ReferralStatusPill } from './ReferralStatusPill';
import { SnapshotContextViewer } from './SnapshotContextViewer';
import styles from './ReferralDetailPage.module.css';

/** Referrals use their own vocabulary: a `no_show` here reads "Did not
 * attend", unlike the doctor's queue ("No show") or the availability screen
 * ("marked as a no-show"). Each id gets a separate message key. */
function referralAppointmentLabel(status: AppointmentStatus, t: Translate): string {
  switch (status) {
    case 'scheduled':
      return t('referrals.appointment.status.scheduled', 'Scheduled');
    case 'checked_in':
      return t('referrals.appointment.status.checked_in', 'Checked in');
    case 'in_progress':
      return t('referrals.appointment.status.in_progress', 'In progress');
    case 'completed':
      return t('referrals.appointment.status.completed', 'Completed');
    case 'cancelled':
      return t('referrals.appointment.status.cancelled', 'Cancelled');
    case 'no_show':
      return t('referrals.appointment.status.no_show', 'Did not attend');
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ReferralDetailPage({ referralId }: { referralId: string }) {
  const t = useT();
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
      errorMessage={(error) =>
        errorText(error) ?? t('referrals.detail.loadFailed', 'Could not load this referral. Please try again.')
      }
      fallback={{ label: t('referrals.detail.back', 'Back to referrals'), to: '/doctor/referrals' }}
      loading={<Skeleton lines={6} label={t('referrals.detail.loading', 'Loading referral…')} />}
    >
      {(referral) => (
        <div className={styles.root}>
          <Link className={styles.backLink} to="/doctor/referrals">
            {t('referrals.detail.back', 'Back to referrals')}
          </Link>

          <div className={styles.header}>
            <h1 className={styles.heading}>
              {t('referrals.detail.heading', 'Referral from {name}', {
                name: referral.referringDoctor.fullName,
              })}
            </h1>
            <ReferralStatusPill status={referral.status} />
          </div>

          <SnapshotContextViewer referral={referral} />

          {referral.resultingAppointmentId && referral.appointment ? (
            <section className={styles.appointment} aria-labelledby="appointment-heading">
              <h2 id="appointment-heading" className={styles.appointmentHeading}>
                {t('referrals.detail.resultingAppointment', 'Resulting appointment')}
              </h2>
              <p className={styles.appointmentStatus}>
                {referralAppointmentLabel(referral.appointment.status, t)}
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
                {t('referrals.detail.viewAppointment', 'View appointment')}
              </Link>
            </section>
          ) : null}
        </div>
      )}
    </QueryState>
  );
}
