import { useState } from 'react';
import {
  useQueue,
  useVisitActions,
  useRunningDelay,
  useUpdateRunningDelay,
  UNDO_WINDOW_MS,
} from '../hooks/useQueue';
import { Button } from '../../../components/Button';
import styles from './QueuePanel.module.css';

function formatTime(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string) {
  return {
    checked_in: 'Checked in',
    in_progress: 'In progress',
    completed: 'Completed',
  }[status] ?? status;
}

export function QueuePanel() {
  const { data: queue = [] } = useQueue();
  const { startVisit, completeVisit, undo, isPending, hasPendingUndo } = useVisitActions();
  const { data: delay } = useRunningDelay();
  const updateDelay = useUpdateRunningDelay();

  const [overrideMin, setOverrideMin] = useState('');
  const [undoTarget, setUndoTarget] = useState<string | null>(null);

  const byPosition = [...queue].sort((a, b) => a.queuePosition - b.queuePosition);

  const handleUndo = () => {
    if (undoTarget) undo(undoTarget);
    setUndoTarget(null);
  };

  const handleApplyOverride = () => {
    const value = overrideMin.trim() === '' ? null : parseInt(overrideMin, 10);
    updateDelay.mutate({ manualOverrideMin: value });
    setOverrideMin('');
  };

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <h2>Live queue</h2>
        <div className={styles.runningDelay}>
          <span className={styles.label}>Running delay</span>
          <span className={styles.value}>
            {delay?.effectiveDelayMin == null ? '—' : `${delay.effectiveDelayMin} min`}
            {delay?.manualOverrideMin != null && delay.manualOverrideMin > 0
              ? ` (${delay.manualOverrideMin} min late)`
              : ''}
          </span>
        </div>
      </header>

      {hasPendingUndo && undoTarget && (
        <div className={styles.undoToast}>
          Action applied.{' '}
          <Button variant="secondary" onClick={handleUndo}>
            Undo
          </Button>
          <span className={styles.undoHint}>reverts in {Math.round(UNDO_WINDOW_MS / 1000)}s</span>
        </div>
      )}

      {byPosition.length === 0 ? (
        <p className={styles.empty}>No checked-in patients yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Patient</th>
              <th>Checked in</th>
              <th>Status</th>
              <th className={styles.actionsCol}>Action</th>
            </tr>
          </thead>
          <tbody>
            {byPosition.map((entry) => {
              const isPendingAction = isPending;
              return (
                <tr key={entry.appointmentId} className={styles.row}>
                  <td className={styles.pos}>{entry.queuePosition}</td>
                  <td>{entry.fullName}</td>
                  <td>{formatTime(entry.checkedInAt)}</td>
                  <td>
                    <span className={styles.statusPill} data-status={entry.status}>
                      {statusLabel(entry.status)}
                    </span>
                  </td>
                  <td className={styles.actionsCol}>
                    {entry.status === 'checked_in' && (
                      <Button
                        onClick={() => {
                          setUndoTarget(entry.appointmentId);
                          startVisit(entry.appointmentId);
                        }}
                        disabled={isPendingAction}
                        loading={isPendingAction}
                      >
                        Start
                      </Button>
                    )}
                    {entry.status === 'in_progress' && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setUndoTarget(entry.appointmentId);
                          completeVisit(entry.appointmentId);
                        }}
                        disabled={isPendingAction}
                        loading={isPendingAction}
                      >
                        Complete
                      </Button>
                    )}
                    {entry.status === 'completed' && <span className={styles.done}>Done</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className={styles.override}>
        <label htmlFor="manual-override">Manual override</label>
        <input
          id="manual-override"
          type="number"
          placeholder="min"
          value={overrideMin}
          onChange={(e) => setOverrideMin(e.target.value)}
          className={styles.overrideInput}
        />
        <Button
          onClick={handleApplyOverride}
          disabled={updateDelay.isPending}
          loading={updateDelay.isPending}
        >
          Set
        </Button>
      </div>
    </section>
  );
}
