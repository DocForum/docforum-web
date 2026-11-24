import { Link } from 'react-router-dom';
import { DisputesQueue } from '../features/admin-disputes/components/DisputesQueue';
import styles from '../features/admin-disputes/components/Disputes.module.css';
import { useT } from '../i18n/useT';

export function AdminDisputesPage() {
  const t = useT();
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        {t('admin.backToOverview', '← Back to the operations overview')}
      </Link>
      <DisputesQueue />
    </div>
  );
}
