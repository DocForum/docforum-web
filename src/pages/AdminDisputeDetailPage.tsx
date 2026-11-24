import { Link, useParams } from 'react-router-dom';
import { DisputeDetail } from '../features/admin-disputes/components/DisputeDetail';
import styles from '../features/admin-disputes/components/Disputes.module.css';
import { useT } from '../i18n/useT';

export function AdminDisputeDetailPage() {
  const t = useT();
  const { disputeId } = useParams<{ disputeId: string }>();

  return (
    <div className={styles.page}>
      {disputeId ? (
        <DisputeDetail disputeId={disputeId} />
      ) : (
        <>
          <Link to="/admin/disputes" className={styles.backLink}>
            {t('adminDisputes.detail.back', '← All disputes')}
          </Link>
          <p className={styles.empty}>
            {t('adminDisputes.detail.noSelection', 'No dispute was selected. Return to the queue.')}
          </p>
        </>
      )}
    </div>
  );
}
