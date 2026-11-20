import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  useQueue,
  useVisitActions,
  useRunningDelay,
  useUpdateRunningDelay,
  UNDO_WINDOW_MS,
} from '../hooks/useQueue';
import { useNavigate } from "react-router-dom";
import { Button } from '../../../components/Button';
import { LiveRegion } from '../../../components/LiveRegion';
import { useAnnouncer } from '../../../hooks/useAnnouncer';
import { useFormat } from '../../../i18n/useFormat';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { useT } from '../../../i18n/useT';
import { formatTime } from '../../../i18n/time-zone';
import type { QueueEntry } from '../../../types/models';
import styles from './QueuePanel.module.css';

function statusLabel(status: string, t: ReturnType<typeof useT>) {
  return {
    checked_in: t('queue.status.checkedIn', 'Checked in'),
    in_progress: t('queue.status.inProgress', 'In progress'),
    completed: t('queue.status.completed', 'Completed'),
  }[status] ?? status;
}

/** Count-only summary — deliberately no patient names, so it can be announced. */
function queueSummary(entries: QueueEntry[]): string {
  const waiting = entries.filter((entry) => entry.status === 'checked_in').length;
  const inProgress = entries.filter((entry) => entry.status === 'in_progress').length;
  const completed = entries.filter((entry) => entry.status === 'completed').length;
  const parts = [`${waiting} waiting`, `${inProgress} in progress`];
  if (completed > 0) parts.push(`${completed} completed`);
  return `${entries.length} ${entries.length === 1 ? 'patient' : 'patients'} in the queue: ${parts.join(', ')}.`;
}

/**
 * Polite, batched queue announcements. The queue refetches every 30s; a
 * screen reader must hear one summary per change, not one message per row.
 */
const QueueAnnouncements = memo(function QueueAnnouncements({ entries }: { entries: QueueEntry[] }) {
  const summary = queueSummary(entries);
  const { message, announce } = useAnnouncer();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current === null) {
      previous.current = summary;
      return;
    }
    if (previous.current !== summary) {
      previous.current = summary;
      announce(`Queue updated. ${summary}`);
    }
  }, [summary, announce]);

  return <LiveRegion message={message} />;
});

export function QueuePanel() {
  const t = useT();
  const { timeZone } = useTimeZone();
  const { data: queue = [] } = useQueue();
  const { startVisit, completeVisit, undo, isPending, hasPendingUndo } = useVisitActions();
  const { data: delay } = useRunningDelay();
  const updateDelay = useUpdateRunningDelay();
  const { formatNumber } = useFormat();
  const { message: actionMessage, announce } = useAnnouncer();

  const [overrideMin, setOverrideMin] = useState('');
  const [undoTarget, setUndoTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  const byPosition = useMemo(
    () => [...queue].sort((a, b) => a.queuePosition - b.queuePosition),
    [queue],
  );

  const entryName = (appointmentId: string) =>
    byPosition.find((entry) => entry.appointmentId === appointmentId)?.fullName ?? 'patient';

  const handleUndo = () => {
    if (undoTarget) {
      announce(`Undid the last queue action for ${entryName(undoTarget)}.`);
      undo(undoTarget);
    }
    setUndoTarget(null);
  };

  const handleStart = (entry: QueueEntry) => {
    setUndoTarget(entry.appointmentId);
    announce(
      `Starting visit for ${entry.fullName}. Undo is available for ${Math.round(UNDO_WINDOW_MS / 1000)} seconds.`,
    );
    startVisit(entry.appointmentId);
  };

  const handleComplete = (entry: QueueEntry) => {
    setUndoTarget(entry.appointmentId);
    announce(`Completing visit for ${entry.fullName}. Undo is available.`);
    completeVisit(entry.appointmentId);
  };

  const handleApplyOverride = () => {
    const value = overrideMin.trim() === '' ? null : parseInt(overrideMin, 10);
    updateDelay.mutate(
      { manualOverrideMin: value },
      {
        onSuccess: (next) =>
          announce(
            next.manualOverrideMin == null
              ? 'Running delay override cleared.'
              : `Running delay set to ${next.effectiveDelayMin} minutes.`,
          ),
      },
    );
    setOverrideMin('');
  };

  return (
    <section className={styles.panel} aria-labelledby="queue-heading">
      <header className={styles.panelHeader}>
        <h2 id="queue-heading">{t('queue.title', 'Live queue')}</h2>
        <div className={styles.runningDelay}>
          <span className={styles.label} id="running-delay-label">
            {t('queue.runningDelay', 'Running delay')}
          </span>
          <span
            className={styles.value}
            aria-live="off"
            aria-describedby="running-delay-label"
          >
            {delay?.effectiveDelayMin == null
              ? '—'
              : `${formatNumber(delay.effectiveDelayMin)} min`}
            {delay?.manualOverrideMin != null && delay.manualOverrideMin > 0
              ? ` (${formatNumber(delay.manualOverrideMin)} min late)`
              : ''}
          </span>
        </div>
      </header>

      {hasPendingUndo && undoTarget && (
        <div className={styles.undoToast} role="group" aria-label="Undo last queue action">
          Action applied.{' '}
          <Button variant="secondary" onClick={handleUndo}>
            Undo
          </Button>
          <span className={styles.undoHint}>
            reverts in {Math.round(UNDO_WINDOW_MS / 1000)}s
          </span>
        </div>
      )}

      {byPosition.length === 0 ? (
        <p className={styles.empty}>{t('queue.empty', 'No checked-in patients yet.')}</p>
      ) : (
        <table className={styles.table} aria-busy={isPending}>
          <caption className="srOnly">
            Today&apos;s checked-in patients in queue order, with visit status and actions
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Patient</th>
              <th scope="col">Checked in</th>
              <th scope="col">Status</th>
              <th scope="col" className={styles.actionsCol}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {byPosition.map((entry) => {
              const isPendingAction = isPending;
              return (
                <tr key={entry.appointmentId} className={styles.row}>
                  <td className={styles.pos}>{formatNumber(entry.queuePosition)}</td>
                  <th scope="row" className={styles.nameCell}>
                    {entry.fullName}
                  </th>
                  <td>
                    <time dateTime={entry.checkedInAt}>{formatTime(entry.checkedInAt, timeZone)}</time>
                  </td>
                  <td>
                    <span className={styles.statusPill} data-status={entry.status}>
                      {statusLabel(entry.status, t)}
                    </span>
                  </td>
                  <td className={styles.actionsCol}>
                    {entry.status === 'checked_in' && (
                      <Button
                        onClick={() => handleStart(entry)}
                        disabled={isPendingAction}
                        loading={isPendingAction}
                        aria-label={`Start visit for ${entry.fullName}`}
                      >
                        {t('queue.start', 'Start')}
                      </Button>
                    )}
                    {entry.status === 'in_progress' && (
                      <Button
                        variant="secondary"
                        onClick={() => handleComplete(entry)}
                        disabled={isPendingAction}
                        loading={isPendingAction}
                        aria-label={`Complete visit for ${entry.fullName}`}
                      >
                        {t('queue.complete', 'Complete')}
                      </Button>
                    )}
                    {entry.status === 'completed' && <span className={styles.done}>{t('queue.done', 'Done')}</span>}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigate(`/doctor/patient-chart/${entry.patientProfileId}`);
                      }}
                    >
                      Chart
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <QueueAnnouncements entries={byPosition} />
      <LiveRegion message={actionMessage} />

      <div className={styles.override}>
        <label htmlFor="manual-override">{t('queue.manualOverride', 'Manual override')}</label>
        <input
          id="manual-override"
          type="number"
          inputMode="numeric"
          placeholder={t('queue.minPlaceholder', 'min')}
          aria-describedby="manual-override-hint"
          value={overrideMin}
          onChange={(e) => setOverrideMin(e.target.value)}
          className={styles.overrideInput}
        />
        <Button
          onClick={handleApplyOverride}
          disabled={updateDelay.isPending}
          loading={updateDelay.isPending}
        >
          {t('queue.set', 'Set')}
        </Button>
        <span id="manual-override-hint" className="srOnly">
          Minutes to add to the computed running delay. Leave blank to clear the override.
        </span>
      </div>
    </section>
  );
}
