import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '../../../components/Button';
import { useSlowRequestHint } from '../../../hooks/useSlowRequestHint';
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
      setOutcome(describeRun(await run.mutateAsync(job.name)));
    } catch (error) {
      setOutcome(describeRunError(error, job.name));
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
          {outcome ? `Manual run: ${job.name}` : `Run ${job.name} now?`}
        </h2>

        {outcome ? (
          <div id={resultId} className={styles.result} data-tone={outcome.tone} role="status">
            <StatusPill tone={outcome.tone} label={outcome.title} />
            <p>{outcome.detail}</p>
          </div>
        ) : (
          <div id={descriptionId} className={styles.dialogDescription}>
            <p>
              This runs the job immediately, outside its schedule ({job.schedule}). It does the job's real work — whatever
              it normally changes, it changes now.
            </p>
            <dl className={styles.dialogFacts}>
              <div>
                <dt>Last run</dt>
                <dd>{job.lastRun ? <TimeAgo iso={job.lastRun.startedAt} now={now} /> : 'Never'}</dd>
              </div>
              <div>
                <dt>Next scheduled run</dt>
                <dd>
                  {job.nextRunAt ? (
                    <>
                      {overdueBy(job, now) > 0 && 'was due '}
                      <TimeAgo iso={job.nextRunAt} now={now} />
                    </>
                  ) : (
                    'Not scheduled'
                  )}
                </dd>
              </div>
            </dl>
            <p className={styles.dialogNote}>
              If another instance is already running it, docforum-core won't start a second run.
            </p>
          </div>
        )}

        {run.isPending && (
          <p className={styles.inlineStatus} role="status">
            {slow ? 'Still running — long jobs, or a cold-starting backend, can take a minute.' : 'Waiting for docforum-core…'}
          </p>
        )}

        <div className={styles.dialogActions}>
          {outcome ? (
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={run.isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleRun()} loading={run.isPending}>
                {run.isPending ? 'Running…' : 'Run now'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
