import { useState } from 'react';
import { usePendingAbnormalResults, useAcknowledgeAbnormalResult } from '../hooks/useResults';
import { Button } from '../../../components/Button';
import type { AbnormalResult } from '../../../types/models';
import styles from './AbnormalResultsInbox.module.css';

export function AbnormalResultsInbox() {
  const { data: results = [], isLoading, error } = usePendingAbnormalResults();
  const acknowledgeMutation = useAcknowledgeAbnormalResult();
  const [acknowledgeOpen, setAcknowledgeOpen] = useState<{ id: string; patientName: string } | null>(null);
  const [acknowledgeNote, setAcknowledgeNote] = useState('');

  // Sort: critical first, then by issuedAt ascending (older first)
  const sortedResults = [...results].sort((a, b) => {
    if (a.isCritical !== b.isCritical) return b.isCritical ? 1 : -1; // critical first (true > false)
    return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(); // older first
  });

  const handleAcknowledge = async (result: AbnormalResult) => {
    setAcknowledgeOpen({ id: result.id, patientName: result.patientName });
    setAcknowledgeNote('');
  };

  const handleAcknowledgeSubmit = async () => {
    await acknowledgeMutation.mutateAsync({
      resultId: acknowledgeOpen!.id,
      note: acknowledgeNote || undefined,
    });
    setAcknowledgeOpen(null);
  };

  const handleAcknowledgeCancel = () => {
    setAcknowledgeOpen(null);
  };

  if (isLoading) return <p>Loading results...</p>;
  if (error) return <p>Error loading results.</p>;

  const criticalCount = results.filter(r => r.isCritical).length;
  const totalCount = results.length;

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <h2>Results needing review</h2>
        {totalCount > 0 && (
          <span className={styles.badge}>
            {criticalCount} critical, {totalCount} total
          </span>
        )}
      </header>

      {acknowledgeOpen && (
        <div className={styles.acknowledgeModal}>
          <div className={styles.acknowledgeModalContent}>
            <h3>Acknowledge result for {acknowledgeOpen.patientName}</h3>
            <textarea
              value={acknowledgeNote}
              onChange={(e) => setAcknowledgeNote(e.target.value)}
              placeholder={'Optional note (e.g., "Called patient, will follow up tomorrow")'}
              className={styles.acknowledgeNote}
            />
            <div className={styles.acknowledgeActions}>
              <Button variant="secondary" onClick={handleAcknowledgeCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleAcknowledgeSubmit}
                loading={acknowledgeMutation.isPending}
              >
                Acknowledge
              </Button>
            </div>
          </div>
        </div>
      )}

      {sortedResults.length === 0 && !acknowledgeOpen ? (
        <p className={styles.empty}>No results awaiting review.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Test</th>
              <th>Value</th>
              <th>Issued</th>
              <th className={styles.actionsCol}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result) => {
              const isPendingAcknowledge = acknowledgeMutation.isPending && acknowledgeMutation.variables?.resultId === result.id;
              return (
                <tr key={result.id} className={`${styles.row} ${result.isCritical ? styles.criticalRow : ''}`}>
                  <td>{result.patientName}</td>
                  <td>{result.testName}</td>
                  <td>{result.value}</td>
                  <td>
                    {new Date(result.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className={styles.actionsCol}>
                    <Button
                      onClick={() => handleAcknowledge(result)}
                      disabled={isPendingAcknowledge}
                      loading={isPendingAcknowledge}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        // TODO: navigate to messaging thread for this patient
                        console.log('Message patient:', result.patientName);
                      }}
                    >
                      Message patient
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
