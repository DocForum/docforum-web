import { Link } from 'react-router-dom';
import { SystemHealthConsole } from '../features/admin-system/components/SystemHealthConsole';
import styles from '../features/admin-system/components/SystemHealth.module.css';

export function AdminSystemPage() {
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        ← Back to payments console
      </Link>
      <SystemHealthConsole />
    </div>
  );
}
