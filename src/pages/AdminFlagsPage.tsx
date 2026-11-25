import { Link } from 'react-router-dom';
import { FeatureFlagsConsole } from '../features/admin-flags/components/FeatureFlagsConsole';
import styles from '../features/admin-flags/components/FeatureFlags.module.css';
import { useT } from '../i18n/useT';

export function AdminFlagsPage() {
  const t = useT();
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        {t('admin.backToOverview', '← Back to the operations overview')}
      </Link>
      <FeatureFlagsConsole />
    </div>
  );
}
