import { Link } from 'react-router-dom';
import { StuckReferralsConsole } from '../features/admin-referrals/components/StuckReferralsConsole';
import styles from '../features/admin-referrals/components/StuckReferrals.module.css';

export function AdminReferralsPage() {
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        ← Back to payments console
      </Link>
      <StuckReferralsConsole />
    </div>
  );
}
