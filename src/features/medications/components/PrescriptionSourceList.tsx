import { useIntl } from 'react-intl';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
import { FormError } from '../../../components/FormError';
import { useT } from '../../../i18n/useT';
import { useMedicationSchedule } from '../hooks/useMedicationSchedule';
import styles from './PrescriptionSourceList.module.css';

// Renders each prescription line exactly as the prescriber wrote it, so the
// derived Today/This-week view can always be checked against its source.
export function PrescriptionSourceList() {
  const t = useT();
  const intl = useIntl();
  const { data: prescriptions, isLoading, error } = useMedicationSchedule();

  const apiError = error instanceof ApiError ? error.message : error ? t('meds.source.error', 'Failed to load prescriptions.') : null;
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
      <h2 className={styles.heading}>{t('meds.source.title', 'Prescription source')}</h2>
      <p className={styles.note}>
        {t('meds.source.note', 'The lines below are copied from your prescriptions without interpretation.')}
      </p>
      {prescriptions.map((rx) => (
        <div key={rx.id} className={styles.prescription}>
          <div className={styles.prescriptionHeader}>
            <span className={styles.prescriber}>
              {rx.prescribingDoctorName ?? t('meds.source.prescriberUnknown', 'Prescriber not listed')}
            </span>
            {rx.createdAt && (
              <span className={styles.issued}>
                {t('meds.source.issued', 'Issued {date}', {
                  date: intl.formatDate(rx.createdAt, { year: 'numeric', month: 'short', day: 'numeric' }),
                })}
              </span>
            )}
          </div>
          <ul className={styles.items}>
            {rx.items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.drug}>{item.drugName}</span>
                <dl className={styles.fields}>
                  <div className={styles.field}>
                    <dt>{t('meds.source.dosage', 'Dosage')}</dt>
                    <dd>{item.dosage || '—'}</dd>
                  </div>
                  <div className={styles.field}>
                    <dt>{t('meds.source.frequency', 'Frequency')}</dt>
                    <dd>{item.frequency || '—'}</dd>
                  </div>
                  <div className={styles.field}>
                    <dt>{t('meds.source.duration', 'Duration')}</dt>
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
