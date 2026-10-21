import { Link } from 'react-router-dom';
import { VerificationsQueue } from '../features/admin-verification/components/VerificationsQueue';
import styles from '../features/admin-verification/components/Verifications.module.css';

export function AdminVerificationsPage() {
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        ← Back to admin
      </Link>
      <VerificationsQueue />
    </div>
  );
}
