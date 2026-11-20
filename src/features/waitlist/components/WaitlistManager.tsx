import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { FormError } from '../../../components/FormError';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { ApiError } from '../../../services/api-client';
import type { PreferredTimeWindow, WaitlistEntry, WaitlistStatus } from '../../../types/models';
import {
  useLeaveWaitlist,
  useUpdateWaitlistEntry,
  useWaitlist,
} from '../hooks/useWaitlist';
import { WINDOW_LABEL } from '../window-label';
import styles from './Waitlist.module.css';

const STATUS_LABEL: Record<WaitlistStatus, string> = {
  waiting: 'Waiting',
  offer_pending: 'Offer waiting for you',
  booked: 'Booked',
  expired: 'Expired',
  left: 'Left',
};

function entryName(entry: WaitlistEntry): string {
  return entry.doctorName ?? entry.specialtyName ?? 'Next available doctor';
}

function entryTarget(entry: WaitlistEntry): string {
  if (entry.doctorName && entry.specialtyName) return entry.specialtyName;
  return entry.specialtyName ? `Any doctor in ${entry.specialtyName}` : 'Any specialty';
}

function WaitlistRow({ entry }: { entry: WaitlistEntry }) {
  const [timeWindow, setTimeWindow] = useState<PreferredTimeWindow>(entry.preferredWindow);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const updateMutation = useUpdateWaitlistEntry();
  const leaveMutation = useLeaveWaitlist();
  const errorMessage = useErrorMessage();

  const isActive = entry.status === 'waiting' || entry.status === 'offer_pending';
  const changed = timeWindow !== entry.preferredWindow;
  const conflict =
    updateMutation.error instanceof ApiError && updateMutation.error.status === 409;

  function save() {
    updateMutation.mutate({
      entryId: entry.id,
      input: { preferredWindow: timeWindow, expectedUpdatedAt: entry.updatedAt },
    });
  }

  return (
    <li className={styles.entry}>
      <div className={styles.entryHeader}>
        <div>
          <h3 className={styles.entryName}>{entryName(entry)}</h3>
          <p className={styles.entryDetail}>{entryTarget(entry)}</p>
        </div>
        <span className={styles.status}>{STATUS_LABEL[entry.status]}</span>
      </div>

      {isActive ? (
        <>
          <div className={styles.windowRow}>
            <label className={styles.fieldLabel} htmlFor={`window-${entry.id}`}>
              Preferred time
            </label>
            <select
              id={`window-${entry.id}`}
              className={styles.select}
              value={timeWindow}
              onChange={(event) => setTimeWindow(event.target.value as PreferredTimeWindow)}
            >
              {(Object.keys(WINDOW_LABEL) as PreferredTimeWindow[]).map((value) => (
                <option key={value} value={value}>
                  {WINDOW_LABEL[value]}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={save}
              disabled={!changed}
              loading={updateMutation.isPending}
            >
              Save
            </Button>
          </div>

          <FormError
            message={
              conflict
                ? 'This entry changed somewhere else. Reload to see the current window.'
                : errorMessage(updateMutation.error)
            }
          />

          <div className={styles.entryActions}>
            <Button variant="secondary" onClick={() => setConfirmingLeave(true)}>
              Leave waitlist
            </Button>
          </div>

          <Dialog
            open={confirmingLeave}
            onClose={() => {
              setConfirmingLeave(false);
              leaveMutation.reset();
            }}
            labelledBy={`leave-heading-${entry.id}`}
            describedBy={`leave-body-${entry.id}`}
            overlayClassName={styles.overlay}
            panelClassName={styles.dialog}
          >
            <h2 id={`leave-heading-${entry.id}`} className={styles.dialogHeading}>
              Leave this waitlist?
            </h2>
            <p id={`leave-body-${entry.id}`} className={styles.dialogBody}>
              You’ll stop receiving offers for {entryName(entry)}. Any offer already held for you
              is released.
            </p>
            <FormError message={errorMessage(leaveMutation.error)} />
            <div className={styles.dialogActions}>
              <Button
                variant="danger"
                loading={leaveMutation.isPending}
                onClick={() =>
                  leaveMutation.mutate(entry.id, { onSuccess: () => setConfirmingLeave(false) })
                }
              >
                Leave waitlist
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmingLeave(false)}
                disabled={leaveMutation.isPending}
              >
                Keep waiting
              </Button>
            </div>
          </Dialog>
        </>
      ) : (
        <p className={styles.entryDetail}>
          {entry.status === 'booked' ? (
            <Link to="/patient">See this appointment on your care summary</Link>
          ) : (
            'This entry is no longer active.'
          )}
        </p>
      )}
    </li>
  );
}

/** "My waitlists" — manage entries: change the preferred window, leave, and
 * see what each entry is waiting for (issue #16). */
export function WaitlistManager() {
  const query = useWaitlist();

  if (query.isPending) {
    return <Skeleton lines={4} label="Loading your waitlists" />;
  }

  if (query.isError) {
    return (
      <InlineError
        title="Your waitlists couldn’t be loaded"
        message={queryErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const entries = query.data?.items ?? [];

  if (entries.length === 0) {
    return (
      <EmptyState
        title="You’re not on a waitlist"
        description="When the doctor or specialty you need has no openings, join the waitlist and we’ll offer you a held slot when one frees up."
        action={{ label: 'Find a doctor', to: '/patient/search' }}
      />
    );
  }

  return (
    <ul className={styles.entries}>
      {entries.map((entry) => (
        <WaitlistRow key={`${entry.id}:${entry.updatedAt}`} entry={entry} />
      ))}
    </ul>
  );
}
