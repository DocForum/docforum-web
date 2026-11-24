import { useT, type Translate } from '../../../i18n/useT';
import type { ReferralStatus } from '../../../types/models';
import styles from './ReferralStatusPill.module.css';

// Status always reads as TEXT; the per-status colour below is redundant
// reinforcement, never the only signal.
function referralStatusLabel(status: ReferralStatus, t: Translate): string {
  switch (status) {
    case 'pending':
      return t('referrals.status.pending', 'Pending');
    case 'accepted':
      return t('referrals.status.accepted', 'Accepted');
    case 'declined':
      return t('referrals.status.declined', 'Declined');
    case 'completed':
      return t('referrals.status.completed', 'Completed');
    case 'expired':
      return t('referrals.status.expired', 'Expired');
    case 'cancelled':
      return t('referrals.status.cancelled', 'Cancelled');
  }
}

export function ReferralStatusPill({ status }: { status: ReferralStatus }) {
  const t = useT();
  return (
    <span className={styles.pill} data-status={status}>
      {referralStatusLabel(status, t)}
    </span>
  );
}
