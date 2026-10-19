import { Link } from 'react-router-dom';
import { FeatureFlagsConsole } from '../features/admin-flags/components/FeatureFlagsConsole';
import styles from '../features/admin-flags/components/FeatureFlags.module.css';

export function AdminFlagsPage() {
  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.backLink}>
        ← Back to payments console
      </Link>
      <FeatureFlagsConsole />
    </div>
  );
}
