import { useParams } from 'react-router-dom';
import { DisputeDetailView } from '../features/admin-disputes/components/DisputeDetailView';
import styles from '../features/admin-disputes/components/Disputes.module.css';

export function AdminDisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();

  return (
    <div className={styles.page}>
      <DisputeDetailView disputeId={disputeId ?? ''} />
    </div>
  );
}
