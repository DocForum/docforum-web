import { Link } from 'react-router-dom';
import styles from './ReferralAccessDenied.module.css';

export type ReferralAccessDeniedReason = 'forbidden' | 'not_found';

/** Rendered for 403 and 404 from `GET /referrals/:id` — most commonly
 * because the referral was reassigned to another specialist. Deliberately
 * takes no referral data: an inaccessible referral must never leak its
 * snapshot content, and the raw ApiError string is not shown to the doctor. */
export function ReferralAccessDenied({ reason = 'forbidden' }: { reason?: ReferralAccessDeniedReason }) {
  return (
    <div className={styles.root}>
      <h1 className={styles.heading}>This referral isn&rsquo;t yours to open</h1>
      <p className={styles.copy}>
        {reason === 'not_found'
          ? 'We couldn\u2019t find this referral.'
          : 'This referral is no longer assigned to you.'}{' '}
        Referrals can be reassigned to another specialist — if that happened, the snapshot context now travels
        with it and the new specialist is the one who should respond.
      </p>
      <p className={styles.copy}>
        Nothing here means a patient stopped needing care. Check your inbox for the referrals currently assigned
        to you.
      </p>
      <Link className={styles.backLink} to="/doctor/referrals">
        Back to referrals
      </Link>
    </div>
  );
}
