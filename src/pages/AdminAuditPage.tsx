import { Link } from 'react-router-dom';
import { AuditLogViewer } from '../features/admin-audit/components/AuditLogViewer';
import styles from '../features/admin-audit/components/AuditLogViewer.module.css';
import { useT } from '../i18n/useT';

export function AdminAuditPage() {
  const t = useT();
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        {t('admin.backToOverview', '← Back to the operations overview')}
      </Link>
      <AuditLogViewer />
    </div>
  );
}
