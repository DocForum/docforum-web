import { Link, useParams } from 'react-router-dom';
import { DisputeDetail } from '../features/admin-disputes/components/DisputeDetail';
import styles from '../features/admin-disputes/components/Disputes.module.css';

export function AdminDisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();

  return (
    <div className={styles.page}>
      {disputeId ? (
        <DisputeDetail disputeId={disputeId} />
      ) : (
        <>
          <Link to="/admin/disputes" className={styles.backLink}>
            ← All disputes
          </Link>
          <p className={styles.empty}>No dispute was selected. Return to the queue.</p>
        </>
      )}
    </div>
  );
}
