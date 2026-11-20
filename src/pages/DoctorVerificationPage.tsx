import { Link } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { useMyDoctorProfile } from '../features/consultation/hooks/useConsultationOrders';
import styles from './DoctorVerificationPage.module.css';

const STATUS_COPY = {
  verified: {
    title: 'Your doctor profile is verified',
    body: 'You can close consultations and issue prescriptions and lab orders.',
  },
  pending: {
    title: 'Verification is still pending',
    body: 'docforum-core lets only verified doctors issue orders. An admin reviews credentials manually; until that review finishes, order issuance is rejected.',
  },
  rejected: {
    title: 'Your doctor profile was not verified',
    body: 'Order issuance is blocked. If you believe this is a mistake, contact the DocForum admin team to have your credentials reviewed again.',
  },
} as const;

/**
 * Where the 403 from order issuance points: the signed-in doctor's own
 * verification status, read from the real `GET /doctors/me`.
 */
export function DoctorVerificationPage() {
  const profile = useMyDoctorProfile();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Doctor verification</h1>
      <p className={styles.lead}>
        Issuing prescriptions and lab orders is gated on a verified doctor
        profile in docforum-core. This page shows the status on your account.
      </p>

      {profile.isLoading && (
        <div className={styles.loading}>
          <Spinner size={18} /> Checking your verification status…
        </div>
      )}

      {profile.isError && (
        <div className={styles.alert} role="alert">
          {profile.error instanceof Error && profile.error.message
            ? profile.error.message
            : 'Your doctor profile could not be loaded.'}
        </div>
      )}

      {profile.data && (
        <section className={styles.card} aria-live="polite">
          <p className={styles.statusRow}>
            <span
              className={styles.statusPill}
              data-status={profile.data.verificationStatus}
            >
              {profile.data.verificationStatus}
            </span>
            <span className={styles.name}>{profile.data.fullName}</span>
          </p>
          <h2 className={styles.cardTitle}>
            {STATUS_COPY[profile.data.verificationStatus].title}
          </h2>
          <p className={styles.cardBody}>
            {STATUS_COPY[profile.data.verificationStatus].body}
          </p>
          <p className={styles.meta}>
            Profile ID <span className={styles.mono}>{profile.data.id}</span>
          </p>
        </section>
      )}

      <p>
        <Link to="/doctor" className={styles.backLink}>
          Back to your day
        </Link>
      </p>
    </div>
  );
}
