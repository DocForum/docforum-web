import { Link } from 'react-router-dom';
import { DisputesQueue } from '../features/admin-disputes/components/DisputesQueue';
import styles from '../features/admin-disputes/components/Disputes.module.css';

export function AdminDisputesPage() {
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        ← Back to payments console
      </Link>
      <DisputesQueue />
    </div>
  );
}
