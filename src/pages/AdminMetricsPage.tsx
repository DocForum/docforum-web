import { Link } from 'react-router-dom';
import { AdminMetricsDashboard } from '../features/admin-metrics/components/AdminMetricsDashboard';
import styles from '../features/admin-metrics/components/AdminMetricsDashboard.module.css';

export function AdminMetricsPage() {
  return (
    <>
      <div className={styles.page}>
        <Link to="/admin">← Back to payments console</Link>
      </div>
      <AdminMetricsDashboard />
    </>
  );
}
