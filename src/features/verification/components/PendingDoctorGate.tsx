import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '../../../components/Spinner';
import { useT } from '../../../i18n/useT';
import { ApiError } from '../../../services/api-client';
import { useDoctorProfile } from '../hooks/useVerification';
import { noRejectionReason, verificationStatusLabel } from '../requirements';
import type { VerificationStatus } from '../../../types/models';
import styles from './VerificationStatusBanner.module.css';

export interface PendingDoctorGateProps {
  children: ReactNode;
  /** Route `DoctorVerificationPage` is mounted at. */
  verificationPath?: string;
  /** Pass the status from an existing profile read to avoid a second query.
   * Omit it and the gate fetches `GET /doctors/me` itself. */
  status?: VerificationStatus | null;
  /** Profile-level rejection reason, derived by the caller from its rejected
   * items — `DoctorProfile` itself carries none. */
  rejectionReason?: string | null;
}

/** Hides the doctor area until the application is verified, and says what to
 * do instead. Fails closed: while the status is unknown or unreadable the
 * rest of the area stays behind the panel rather than being shown. */
export function PendingDoctorGate({
  children,
  verificationPath = '/doctor/verification',
  status,
  rejectionReason,
}: PendingDoctorGateProps) {
  const t = useT();
  const profileQuery = useDoctorProfile({ enabled: status === undefined });
  const resolved: VerificationStatus | null = status ?? profileQuery.data?.verificationStatus ?? null;
  // A freshly signed-up doctor may not have a profile row yet, and `GET
  // /doctors/me` answers 404 for it. That is "nothing verified", not a broken
  // page — so it falls through to the application panel below.
  const noProfileYet = profileQuery.error instanceof ApiError && profileQuery.error.status === 404;

  if (resolved === 'verified') return <>{children}</>;

  if (resolved === null) {
    if (profileQuery.isPending) {
      return (
        <div className={styles.body}>
          <Spinner size={20} />
          <span>{t('verification.gate.checking', 'Checking your verification status…')}</span>
        </div>
      );
    }

    if (profileQuery.isError && !noProfileYet) {
      return (
        <section className={styles.banner} data-status="pending" role="status">
          <h2 className={styles.headline}>{t('verification.gate.readFailed', 'We could not read your application')}</h2>
          <p className={styles.body}>
            {t(
              'verification.gate.readFailedBody',
              'Your verification status is unavailable right now, so the doctor area stays closed. Reload this page, or open your application directly.',
            )}
          </p>
          <Link className={styles.link} to={verificationPath}>
            {t('verification.gate.openApplication', 'Open my verification application')}
          </Link>
        </section>
      );
    }
  }

  // No profile row yet is the same situation as `pending`: nothing verified.
  const effective: VerificationStatus = resolved ?? 'pending';

  return (
    <section className={styles.banner} data-status={effective} role="status">
      <span className={styles.pill}>{verificationStatusLabel(effective, t)}</span>
      <h2 className={styles.headline}>{t('verification.gate.finish', 'Finish your verification application')}</h2>
      <p className={styles.body}>
        {effective === 'rejected'
          ? t(
              'verification.gate.rejectedBody',
              'An admin rejected part of your application. Correct the items named below and resubmit them — appointments, availability and your profile stay closed until the review passes.',
            )
          : t(
              'verification.gate.pendingBody',
              'An admin verifies each document and specialty claim before the rest of the doctor area opens. Upload what is missing and track each item here.',
            )}
      </p>
      {effective === 'rejected' && (
        <p className={styles.reason}>
          <span className={styles.reasonLabel}>{t('verification.reason.label', 'Reason: ')}</span>
          {rejectionReason || noRejectionReason(t)}
        </p>
      )}
      <Link className={styles.link} to={verificationPath}>
        {t('verification.gate.goToApplication', 'Go to my verification application')}
      </Link>
    </section>
  );
}
