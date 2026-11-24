import { Link, useParams } from 'react-router-dom';
import { VerificationDetail } from '../features/admin-verification/components/VerificationDetail';
import styles from '../features/admin-verification/components/Verifications.module.css';

export function AdminVerificationDetailPage() {
  const { doctorProfileId } = useParams<{ doctorProfileId: string }>();

  return (
    <div className={styles.page}>
      {doctorProfileId ? (
        <VerificationDetail doctorProfileId={doctorProfileId} />
      ) : (
        <>
          <Link to="/admin/verifications" className={styles.backLink}>
            ← Back to the queue
          </Link>
          <p className={styles.empty}>No doctor was selected. Return to the queue.</p>
        </>
      )}
    </div>
  );
}
