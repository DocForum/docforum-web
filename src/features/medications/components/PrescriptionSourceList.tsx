import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
import { FormError } from '../../../components/FormError';
import { useMedicationSchedule } from '../hooks/useMedicationSchedule';
import styles from './PrescriptionSourceList.module.css';

function formatIssued(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Renders each prescription line exactly as the prescriber wrote it, so the
// derived Today/This-week view can always be checked against its source.
export function PrescriptionSourceList() {
  const { data: prescriptions, isLoading, error } = useMedicationSchedule();

  const apiError = error instanceof ApiError ? error.message : error ? 'Failed to load prescriptions.' : null;
  if (apiError) return <FormError message={apiError} />;
  if (isLoading || !prescriptions || prescriptions.length === 0) {
    return isLoading ? (
      <div className={styles.loading} role="status">
        <Spinner size={18} />
      </div>
    ) : null;
  }

  return (
    <div className={styles.root}>
      <h2 className={styles.heading}>Prescription source</h2>
      <p className={styles.note}>
        The lines below are copied from your prescriptions without interpretation.
      </p>
      {prescriptions.map((rx) => (
        <div key={rx.id} className={styles.prescription}>
          <div className={styles.prescriptionHeader}>
            <span className={styles.prescriber}>{rx.prescribingDoctorName ?? 'Prescriber not listed'}</span>
            {rx.createdAt && <span className={styles.issued}>Issued {formatIssued(rx.createdAt)}</span>}
          </div>
          <ul className={styles.items}>
            {rx.items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.drug}>{item.drugName}</span>
                <dl className={styles.fields}>
                  <div className={styles.field}>
                    <dt>Dosage</dt>
                    <dd>{item.dosage || '—'}</dd>
                  </div>
                  <div className={styles.field}>
                    <dt>Frequency</dt>
                    <dd>{item.frequency || '—'}</dd>
                  </div>
                  <div className={styles.field}>
                    <dt>Duration</dt>
                    <dd>{item.duration || '—'}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
