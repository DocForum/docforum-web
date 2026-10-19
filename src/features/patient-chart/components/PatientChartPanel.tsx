import { useState } from 'react';
import { usePatientChart } from '../hooks/usePatientChart';
import { Button } from '../../../components/Button';
import { format } from 'date-fns';
import styles from './PatientChartPanel.module.css';

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

  if (isLoading) return <p>Loading patient chart…</p>;
  if (error) return <p>Error loading patient chart.</p>;

  // Extract prior consultations from care thread steps
  const priorConsultations = careThread?.steps
    ?.filter((step) => step.type === 'appointment' || step.type === 'consultation')
    .map((step) => ({
      ...step,
      date: step.createdAt, // approximate
    }))
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
                    {a.value} {a.recordedAt ? ` (as of ${format(new Date(a.recordedAt), 'PPP'))}` : ''}
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
                    {c.value} {c.recordedAt ? ` (as of ${format(new Date(c.recordedAt), 'PPP'))}` : ''}
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
                    {m.value} {m.recordedAt ? ` (as of ${format(new Date(m.recordedAt), 'PPP'))}` : ''}
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
                  {format(new Date(c.createdAt), 'PPP')}
                </span>
                <span className={styles.consultType}>
                  {c.type === 'appointment' ? 'Appointment' : 'Consultation'}
                </span>
                {c.reason && (
                  <span className={styles.consultReason}> – {c.reason}</span>
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
                  <td>{o.orderType === 'prescription' ? 'Prescription' : 'Lab order'}</td>
                  <td>{o.medicationOrTest}</td>
                  <td>{o.instructions ?? ''}</td>
                  <td>{format(new Date(o.issuedAt), 'PPP')}</td>
                  <td>{format(new Date(o.expiresAt), 'PPP')}</td>
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
                  <td>{format(new Date(r.issuedAt), 'PPP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
