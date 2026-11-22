import { useT, type Translate } from '../../../i18n/useT';
import { noRejectionReason, verificationStatusLabel } from '../requirements';
import type { VerificationStatus } from '../../../types/models';
import styles from './VerificationStatusBanner.module.css';

interface Props {
  status: VerificationStatus;
  /** The profile row itself carries no reason (docforum-core's
   * `DoctorProfile` is `{id, userId, fullName, verificationStatus}`), so the
   * page passes the reason it derived from the rejected items. */
  rejectionReason?: string | null;
  fullName?: string;
}

function headline(status: VerificationStatus, t: Translate): string {
  switch (status) {
    case 'pending':
      return t('verification.banner.headlinePending', 'Your application is with a reviewer');
    case 'verified':
      return t('verification.banner.headlineVerified', 'Your doctor account is verified');
    case 'rejected':
      return t('verification.banner.headlineRejected', 'Your application was not approved');
  }
}

function body(status: VerificationStatus, t: Translate): string {
  switch (status) {
    case 'pending':
      return t(
        'verification.banner.bodyPending',
        'Nothing more is needed from you right now. Every document and specialty claim below is reviewed individually, so a row can move to verified on its own.',
      );
    case 'verified':
      return t(
        'verification.banner.bodyVerified',
        'You can publish availability and take patients. Keep this page handy — a reviewer can re-open a claim if a document expires.',
      );
    case 'rejected':
      return t(
        'verification.banner.bodyRejected',
        'Read the reason below, correct the matching items, and resubmit them. Resubmitting starts a fresh review; it does not erase the history.',
      );
  }
}

export function VerificationStatusBanner({ status, rejectionReason, fullName }: Props) {
  const t = useT();
  const greeting = fullName ? t('verification.banner.greeting', ' — {name}', { name: fullName }) : '';

  return (
    <section
      className={styles.banner}
      data-status={status}
      role={status === 'rejected' ? 'alert' : 'status'}
    >
      <span className={styles.pill}>{verificationStatusLabel(status, t)}</span>
      <h2 className={styles.headline}>
        {headline(status, t)}
        {greeting}
      </h2>
      <p className={styles.body}>{body(status, t)}</p>
      {status === 'rejected' && (
        <p className={styles.reason}>
          <span className={styles.reasonLabel}>{t('verification.reason.label', 'Reason: ')}</span>
          {rejectionReason || noRejectionReason(t)}
        </p>
      )}
    </section>
  );
}
