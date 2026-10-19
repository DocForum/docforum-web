import { DisputesConsole } from '../features/admin-disputes/components/DisputesConsole';
import styles from '../features/admin-disputes/components/Disputes.module.css';

export function AdminDisputesPage() {
  return (
    <div className={styles.page}>
      <DisputesConsole />
    </div>
  );
}
