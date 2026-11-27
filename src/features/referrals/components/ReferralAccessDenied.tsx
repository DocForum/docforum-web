import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/useT';
import styles from './ReferralAccessDenied.module.css';

export type ReferralAccessDeniedReason = 'forbidden' | 'not_found';

/** Rendered for 403 and 404 from `GET /referrals/:id` — most commonly
 * because the referral was reassigned to another specialist. Deliberately
 * takes no referral data: an inaccessible referral must never leak its
 * snapshot content, and the raw ApiError string is not shown to the doctor. */
export function ReferralAccessDenied({ reason = 'forbidden' }: { reason?: ReferralAccessDeniedReason }) {
  const t = useT();
  const reasonCopy =
    reason === 'not_found'
      ? t('referrals.denied.notFound', 'We couldn’t find this referral.')
      : t('referrals.denied.notAssigned', 'This referral is no longer assigned to you.');

  return (
    <div className={styles.root}>
      <h1 className={styles.heading}>{t('referrals.denied.heading', 'This referral isn’t yours to open')}</h1>
      <p className={styles.copy}>
        {t(
          'referrals.denied.copy',
          '{reason} Referrals can be reassigned to another specialist — if that happened, the snapshot context now travels with it and the new specialist is the one who should respond.',
          { reason: reasonCopy },
        )}
      </p>
      <p className={styles.copy}>
        {t(
          'referrals.denied.nextSteps',
          'Nothing here means a patient stopped needing care. Check your inbox for the referrals currently assigned to you.',
        )}
      </p>
      <Link className={styles.backLink} to="/doctor/referrals">
        {t('referrals.detail.back', 'Back to referrals')}
      </Link>
    </div>
  );
}
