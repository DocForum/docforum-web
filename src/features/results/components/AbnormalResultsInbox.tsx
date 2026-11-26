import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingAbnormalResults, useAcknowledgeAbnormalResult } from '../hooks/useResults';
import { useThreadIdsForPatients } from '../../messaging/hooks/useMessageThreads';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useT } from '../../../i18n/useT';
import type { AbnormalResult } from '../../../types/models';
import styles from './AbnormalResultsInbox.module.css';
import { paths } from '../../../routes/paths';

export function AbnormalResultsInbox() {
  const t = useT();
  const { data: results = [], isLoading, error, refetch } = usePendingAbnormalResults();
  const acknowledgeMutation = useAcknowledgeAbnormalResult();
  const navigate = useNavigate();
  const [acknowledgeOpen, setAcknowledgeOpen] = useState<{ id: string; patientName: string } | null>(null);
  const [acknowledgeNote, setAcknowledgeNote] = useState('');
  const threadIds = useThreadIdsForPatients(results.map((result) => result.patientProfileId));
  const threadIdByPatient = threadIds.data ?? {};

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

  if (isLoading) return <Skeleton lines={4} height="1.5rem" label={t('results.inbox.loading', 'Loading results')} />;
  if (error) {
    return (
      <InlineError
        title={t('results.inbox.loadFailed', "Results couldn't be loaded")}
        message={queryErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const criticalCount = results.filter(r => r.isCritical).length;
  const totalCount = results.length;

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <h2>{t('results.inbox.title', 'Results needing review')}</h2>
        {totalCount > 0 && (
          <span className={styles.badge}>
            {t(
              'results.inbox.counts',
              '{critical, plural, one {# critical} other {# critical}}, {total, plural, one {# total} other {# total}}',
              { critical: criticalCount, total: totalCount },
            )}
          </span>
        )}
      </header>

      {acknowledgeOpen && (
        <div className={styles.acknowledgeModal}>
          <div className={styles.acknowledgeModalContent}>
            <h3>
              {t('results.inbox.acknowledgeTitle', 'Acknowledge result for {name}', {
                name: acknowledgeOpen.patientName,
              })}
            </h3>
            <textarea
              value={acknowledgeNote}
              onChange={(e) => setAcknowledgeNote(e.target.value)}
              placeholder={t(
                'results.inbox.notePlaceholder',
                'Optional note (e.g., "Called patient, will follow up tomorrow")',
              )}
              className={styles.acknowledgeNote}
            />
            <div className={styles.acknowledgeActions}>
              <Button variant="secondary" onClick={handleAcknowledgeCancel}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleAcknowledgeSubmit}
                loading={acknowledgeMutation.isPending}
              >
                {t('results.inbox.acknowledge', 'Acknowledge')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {sortedResults.length === 0 && !acknowledgeOpen ? (
        <EmptyState
          title={t('results.inbox.empty', 'No results awaiting review')}
          description={t(
            'results.inbox.emptyDescription',
            'Abnormal and critical results appear here as soon as docforum-core issues them, newest first.',
          )}
          action={{ label: t('results.inbox.refresh', 'Refresh inbox'), onClick: () => void refetch() }}
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('results.inbox.col.patient', 'Patient')}</th>
                <th>{t('results.inbox.col.test', 'Test')}</th>
                <th>{t('results.inbox.col.value', 'Value')}</th>
                <th>{t('results.inbox.col.issued', 'Issued')}</th>
                <th className={styles.actionsCol}>{t('results.inbox.col.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result) => {
                const isPendingAcknowledge = acknowledgeMutation.isPending && acknowledgeMutation.variables?.resultId === result.id;
                const threadId = threadIdByPatient[result.patientProfileId];
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
                        {t('results.inbox.acknowledge', 'Acknowledge')}
                      </Button>
                      {threadId && (
                        <Button
                          variant="secondary"
                          aria-label={t('results.inbox.messageAria', 'Message {patient}', {
                            patient: result.patientName,
                          })}
                          onClick={() => navigate(paths.doctor.message(threadId))}
                        >
                          {t('results.inbox.messagePatient', 'Message patient')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
