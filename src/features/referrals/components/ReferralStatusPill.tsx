import type { ReferralStatus } from '../../../types/models';
import styles from './ReferralStatusPill.module.css';

// Status always reads as TEXT; the per-status colour below is redundant
// reinforcement, never the only signal.
const LABELS: Record<ReferralStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  expired: 'Expired',
};

export function ReferralStatusPill({ status }: { status: ReferralStatus }) {
  return (
    <span className={styles.pill} data-status={status}>
      {LABELS[status]}
    </span>
  );
}
