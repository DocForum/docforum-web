import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
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

  if (isLoading) return <Skeleton lines={6} height="1.5rem" label="Loading patient chart" />;
  if (error) {
    return (
      <InlineError
        title="The patient chart couldn't be loaded"
        message={queryErrorMessage(error)}
      />
    );
  }

  // Extract prior consultations from care thread steps
  const priorConsultations = careThread?.steps
    ?.filter((step) => step.stepType === 'appointment' || step.stepType === 'consultation')
    ?? [];

  return (
    <section className={styles.panel}>
      <h2>Patient chart</h2>

      {/* Health Profile */}
      <div className={styles.section}>
        <h3>Health profile</h3>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h4>Allergies</h4>
            {allergies.length === 0 ? (
              <p className={styles.empty}>No allergies recorded.</p>
            ) : (
              <ul>
                {allergies.map((a) => (
                  <li key={a.id}>
                    {a.name}{a.details ? ` (${a.details})` : ''}{' '}
                    {a.updatedAt ? ` (as of ${formatDate(a.updatedAt)})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.card}>
            <h4>Conditions</h4>
            {conditions.length === 0 ? (
              <p className={styles.empty}>No conditions recorded.</p>
            ) : (
              <ul>
                {conditions.map((c) => (
                  <li key={c.id}>
                    {c.name}{c.details ? ` (${c.details})` : ''}{' '}
                    {c.updatedAt ? ` (as of ${formatDate(c.updatedAt)})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.card}>
            <h4>Medications</h4>
            {medications.length === 0 ? (
              <p className={styles.empty}>No medications recorded.</p>
            ) : (
              <ul>
                {medications.map((m) => (
                  <li key={m.id}>
                    {m.name}{m.details ? ` (${m.details})` : ''}{' '}
                    {m.updatedAt ? ` (as of ${formatDate(m.updatedAt)})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Prior Consultations in Thread */}
      <div className={styles.section}>
        <h3>Prior consultations in thread</h3>
        {priorConsultations.length === 0 ? (
          <p className={styles.empty}>No prior consultations in this care thread.</p>
        ) : (
          <ul className={styles.consultList}>
            {priorConsultations.map((c) => (
              <li key={c.id} className={styles.consultItem}>
                <span className={styles.consultDate}>
                  {formatDate(c.timestamp)}
                </span>
                <span className={styles.consultType}>
                  {c.stepType === 'appointment' ? 'Appointment' : 'Consultation'}
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
        <h3>Active orders</h3>
        {activeOrders.length === 0 ? (
          <p className={styles.empty}>No active orders.</p>
        ) : (
          <table className={styles.ordersTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Medication/Test</th>
                <th>Instructions</th>
                <th>Issued</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.type === 'prescription' ? 'Prescription' : 'Lab order'}</td>
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
        <h3>Recent results</h3>
        {recentResults.length === 0 ? (
          <p className={styles.empty}>No recent results.</p>
        ) : (
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Value</th>
                <th>Reference range</th>
                <th>Status</th>
                <th>Issued</th>
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
                      {r.isCritical ? 'Critical' : r.isAbnormal ? 'Abnormal' : 'Normal'}
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
