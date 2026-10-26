import { Link } from 'react-router-dom';
import { AuditLogViewer } from '../features/admin-audit/components/AuditLogViewer';
import styles from '../features/admin-audit/components/AuditLogViewer.module.css';

export function AdminAuditPage() {
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        ← Back to payments console
      </Link>
      <AuditLogViewer />
    </div>
  );
}
