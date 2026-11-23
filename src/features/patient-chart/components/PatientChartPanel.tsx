import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useT } from '../../../i18n/useT';
import { usePatientChart } from '../hooks/usePatientChart';
import styles from './PatientChartPanel.module.css';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PatientChartPanel({ patientProfileId }: { patientProfileId?: string }) {
  const t = useT();
  const {
    allergies,
    conditions,
    medications,
    careThread,
    activeOrders,
    recentResults,
    isLoading,
    error,
  } = usePatientChart(patientProfileId ?? undefined);

  if (isLoading) {
    return (
      <section className={styles.panel}>
        <h1>{t('patientChart.title', 'Patient chart')}</h1>
        <Skeleton lines={6} height="1.5rem" label={t('patientChart.loading', 'Loading patient chart')} />
      </section>
    );
  }
  if (error) {
    return (
      <section className={styles.panel}>
        <h1>{t('patientChart.title', 'Patient chart')}</h1>
        <InlineError
          title={t('patientChart.loadFailed', "The patient chart couldn't be loaded")}
          message={queryErrorMessage(error)}
        />
      </section>
    );
  }

  // Extract prior consultations from care thread steps
  const priorConsultations = careThread?.steps
    ?.filter((step) => step.stepType === 'appointment' || step.stepType === 'consultation')
    ?? [];

  return (
    <section className={styles.panel}>
      <h1>{t('patientChart.title', 'Patient chart')}</h1>

      {/* Health Profile */}
      <div className={styles.section}>
        <h2>{t('patientChart.healthProfile', 'Health profile')}</h2>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>{t('patientChart.allergies', 'Allergies')}</h3>
            {allergies.length === 0 ? (
              <p className={styles.empty}>{t('patientChart.noAllergies', 'No allergies recorded.')}</p>
            ) : (
              <ul>
                {allergies.map((a) => (
                  <li key={a.id}>
                    {a.name}{a.details ? ` (${a.details})` : ''}{' '}
                    {a.updatedAt
                      ? ` (${t('patientChart.asOf', 'as of {date}', { date: formatDate(a.updatedAt) })})`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.card}>
            <h3>{t('patientChart.conditions', 'Conditions')}</h3>
            {conditions.length === 0 ? (
              <p className={styles.empty}>{t('patientChart.noConditions', 'No conditions recorded.')}</p>
            ) : (
              <ul>
                {conditions.map((c) => (
                  <li key={c.id}>
                    {c.name}{c.details ? ` (${c.details})` : ''}{' '}
                    {c.updatedAt
                      ? ` (${t('patientChart.asOf', 'as of {date}', { date: formatDate(c.updatedAt) })})`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.card}>
            <h3>{t('patientChart.medications', 'Medications')}</h3>
            {medications.length === 0 ? (
              <p className={styles.empty}>{t('patientChart.noMedications', 'No medications recorded.')}</p>
            ) : (
              <ul>
                {medications.map((m) => (
                  <li key={m.id}>
                    {m.name}{m.details ? ` (${m.details})` : ''}{' '}
                    {m.updatedAt
                      ? ` (${t('patientChart.asOf', 'as of {date}', { date: formatDate(m.updatedAt) })})`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Prior Consultations in Thread */}
      <div className={styles.section}>
        <h2>{t('patientChart.priorConsultations', 'Prior consultations in thread')}</h2>
        {priorConsultations.length === 0 ? (
          <p className={styles.empty}>
            {t('patientChart.noPriorConsultations', 'No prior consultations in this care thread.')}
          </p>
        ) : (
          <ul className={styles.consultList}>
            {priorConsultations.map((c) => (
              <li key={c.id} className={styles.consultItem}>
                <span className={styles.consultDate}>
                  {formatDate(c.timestamp)}
                </span>
                <span className={styles.consultType}>
                  {c.stepType === 'appointment'
                    ? t('patientChart.step.appointment', 'Appointment')
                    : t('patientChart.step.consultation', 'Consultation')}
                </span>
                {c.description && (
                  <span className={styles.consultReason}> – {c.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Active Orders */}
      <div className={styles.section}>
        <h2>{t('patientChart.activeOrders', 'Active orders')}</h2>
        {activeOrders.length === 0 ? (
          <p className={styles.empty}>{t('patientChart.noActiveOrders', 'No active orders.')}</p>
        ) : (
          <table className={styles.ordersTable}>
            <thead>
              <tr>
                <th>{t('patientChart.col.type', 'Type')}</th>
                <th>{t('patientChart.col.medicationTest', 'Medication/Test')}</th>
                <th>{t('patientChart.col.instructions', 'Instructions')}</th>
                <th>{t('patientChart.col.issued', 'Issued')}</th>
                <th>{t('patientChart.col.expires', 'Expires')}</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.type === 'prescription'
                      ? t('patientChart.order.prescription', 'Prescription')
                      : t('patientChart.order.labOrder', 'Lab order')}
                  </td>
                  <td>{o.items.map((item) => item.name).join(', ')}</td>
                  <td>{o.items.map((item) => item.note).filter(Boolean).join('; ') || ''}</td>
                  <td>{formatDate(o.issuedAt)}</td>
                  <td>{formatDate(o.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Results */}
      <div className={styles.section}>
        <h2>{t('patientChart.recentResults', 'Recent results')}</h2>
        {recentResults.length === 0 ? (
          <p className={styles.empty}>{t('patientChart.noRecentResults', 'No recent results.')}</p>
        ) : (
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>{t('patientChart.col.test', 'Test')}</th>
                <th>{t('patientChart.col.value', 'Value')}</th>
                <th>{t('patientChart.col.referenceRange', 'Reference range')}</th>
                <th>{t('patientChart.col.status', 'Status')}</th>
                <th>{t('patientChart.col.issued', 'Issued')}</th>
              </tr>
            </thead>
            <tbody>
              {recentResults.map((r) => (
                <tr key={r.id}>
                  <td>{r.testName}</td>
                  <td>{r.value}</td>
                  <td>{r.referenceRange}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${r.isCritical ? styles.critical : r.isAbnormal ? styles.abnormal : ''}`}
                    >
                      {r.isCritical
                        ? t('patientChart.result.critical', 'Critical')
                        : r.isAbnormal
                          ? t('patientChart.result.abnormal', 'Abnormal')
                          : t('patientChart.result.normal', 'Normal')}
                    </span>
                  </td>
                  <td>{formatDate(r.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
