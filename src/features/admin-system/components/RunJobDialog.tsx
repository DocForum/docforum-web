import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '../../../components/Button';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
import { useOptionalT } from '../../../i18n/useOptionalT';
import { useRunJob } from '../hooks/useSystemHealth';
import { describeRun, describeRunError } from '../errors';
import { overdueBy } from '../status';
import { StatusPill } from './StatusPill';
import { TimeAgo } from './TimeAgo';
import type { RunOutcome } from '../errors';
import type { BackgroundJob } from '../../../types/models';
import styles from './SystemHealth.module.css';

const FOCUSABLE = 'button:not([disabled]), a[href]';

interface RunJobDialogProps {
  job: BackgroundJob;
  now: number;
  onClose: () => void;
}

/**
 * Confirms a manual run, then shows docforum-core's answer in place, so the
 * admin reads the result before the dialog goes away. It can't be
 * dismissed while the request is in flight.
 */
export function RunJobDialog({ job, now, onClose }: RunJobDialogProps) {
  const t = useOptionalT().t;
  const titleId = useId();
  const descriptionId = useId();
  const resultId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const run = useRunJob();
  const slow = useSlowRequestHint(run.isPending);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  // Focus goes back to whatever opened the dialog when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus();
  }, []);

  // The first button is Cancel while confirming — so Enter on a freshly
  // opened dialog never fires a job — and Close once the result is in.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [outcome]);

  const handleRun = async () => {
    try {
      setOutcome(describeRun(await run.mutateAsync(job.name), t));
    } catch (error) {
      setOutcome(describeRunError(error, job.name, t));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!run.isPending) onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={outcome ? resultId : descriptionId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          {outcome
            ? t('adminSystem.runDialog.resultTitle', 'Manual run: {jobName}', { jobName: job.name })
            : t('adminSystem.runDialog.title', 'Run {jobName} now?', { jobName: job.name })}
        </h2>

        {outcome ? (
          <div id={resultId} className={styles.result} data-tone={outcome.tone} role="status">
            <StatusPill tone={outcome.tone} label={outcome.title} />
            <p>{outcome.detail}</p>
          </div>
        ) : (
          <div id={descriptionId} className={styles.dialogDescription}>
            <p>
              {t(
                'adminSystem.runDialog.description',
                "This runs the job immediately, outside its schedule ({schedule}). It does the job's real work — whatever it normally changes, it changes now.",
                { schedule: job.schedule },
              )}
            </p>
            <dl className={styles.dialogFacts}>
              <div>
                <dt>{t('adminSystem.runDialog.lastRun', 'Last run')}</dt>
                <dd>
                  {job.lastRun ? (
                    <TimeAgo iso={job.lastRun.startedAt} now={now} />
                  ) : (
                    t('adminSystem.runDialog.never', 'Never')
                  )}
                </dd>
              </div>
              <div>
                <dt>{t('adminSystem.runDialog.nextScheduled', 'Next scheduled run')}</dt>
                <dd>
                  {job.nextRunAt ? (
                    <>
                      {overdueBy(job, now) > 0 && `${t('adminSystem.job.wasDue', 'was due')} `}
                      <TimeAgo iso={job.nextRunAt} now={now} />
                    </>
                  ) : (
                    t('adminSystem.job.notScheduled', 'Not scheduled')
                  )}
                </dd>
              </div>
            </dl>
            <p className={styles.dialogNote}>
              {t(
                'adminSystem.runDialog.note',
                "If another instance is already running it, docforum-core won't start a second run.",
              )}
            </p>
          </div>
        )}

        {run.isPending && (
          <p className={styles.inlineStatus} role="status">
            {slow
              ? t(
                  'adminSystem.runDialog.stillRunning',
                  'Still running — long jobs, or a cold-starting backend, can take a minute.',
                )
              : t('adminSystem.runDialog.waiting', 'Waiting for docforum-core…')}
          </p>
        )}

        <div className={styles.dialogActions}>
          {outcome ? (
            <Button type="button" onClick={onClose}>
              {t('adminSystem.runDialog.close', 'Close')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={run.isPending}>
                {t('adminSystem.runDialog.cancel', 'Cancel')}
              </Button>
              <Button type="button" onClick={() => void handleRun()} loading={run.isPending}>
                {run.isPending ? t('adminSystem.job.running', 'Running…') : t('adminSystem.job.runNow', 'Run now')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
