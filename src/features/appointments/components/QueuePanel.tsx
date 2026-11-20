import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import { useAppointmentQueue, useCheckIn, useQueueNotification } from '../hooks/useAppointmentQueue';
import { canCheckIn } from '../queue';
import { formatSlotTime, shouldPollQueue } from '../slot';
import type { PatientAppointment, AppointmentQueue } from '../../../types/models';
import styles from './QueuePanel.module.css';

interface Props {
  appointment: PatientAppointment;
  now: Date;
}

/** A queue read that came back too long ago is not "live" — say so instead of
 * leaving a stale position looking current. */
const STALE_AFTER_MS = 60_000;

function unavailableMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'Check-in is not available for this visit yet.';
  }
  if (error instanceof ApiError) return error.message;
  return 'The live queue could not be loaded.';
}

function phaseHeading(queue: AppointmentQueue): string {
  switch (queue.phase) {
    case 'not_open':
      return 'Check-in is not open yet';
    case 'waiting':
      return queue.checkedInAt ? 'You are in the queue' : 'Queue';
    case 'being_seen':
      return "It's your turn";
    case 'completed':
      return 'Your visit is complete';
  }
}

/** null is reported as "not published", never as 0 — a missing position must
 * not read as "you're next". */
function queueDetail(queue: AppointmentQueue): string {
  if (queue.phase === 'being_seen') return 'Go to the desk now — the clinician is ready for you.';
  if (queue.phase === 'completed') return 'Nothing left to wait for.';
  if (queue.peopleAhead === null) return 'Your place in the queue has not been published yet.';

  const ahead = `${queue.peopleAhead} ${queue.peopleAhead === 1 ? 'person' : 'people'} ahead of you`;
  // The issue's wording: an estimate is always labelled as one.
  const wait =
    queue.estimatedWaitMinutes === null ? ' · no wait estimate yet' : ` · about ${queue.estimatedWaitMinutes} min (estimate)`;
  return `${ahead}${wait}`;
}

function notOpenDetail(queue: AppointmentQueue, now: Date): string {
  if (!queue.checkInOpensAt) return 'Check-in opens on the day of your appointment.';
  const opens = new Date(queue.checkInOpensAt);
  if (Number.isNaN(opens.getTime())) return 'Check-in opens on the day of your appointment.';
  // A window that has already opened but not yet been recomputed by the
  // backend is open — saying "opens at 11:00" next to a live button is a lie.
  if (opens.getTime() <= now.getTime()) return 'Check-in is open now.';
  return `Check-in opens at ${formatSlotTime(queue.checkInOpensAt)}.`;
}

export function QueuePanel({ appointment, now }: Props) {
  const queueQuery = useAppointmentQueue(appointment.id, shouldPollQueue(appointment, now));
  const checkInMutation = useCheckIn(appointment.id);
  const [alertsWanted, setAlertsWanted] = useState(false);
  const notification = useQueueNotification(queueQuery.data, alertsWanted);

  if (queueQuery.isError) {
    return (
      <InlineError
        title="The live queue isn't available"
        message={unavailableMessage(queueQuery.error)}
        onRetry={() => void queueQuery.refetch()}
      />
    );
  }

  const queue = queueQuery.data;
  if (!queue) {
    return queueQuery.isFetching ? (
      <Skeleton lines={2} label="Checking the live queue" />
    ) : (
      <EmptyState
        title="No live queue is available for this visit yet"
        description="Your place in the queue appears here once the clinic opens check-in on the day."
        action={{ label: 'Back to your appointments', to: '/patient/appointments' }}
      />
    );
  }

  const stale = queueQuery.dataUpdatedAt > 0 && now.getTime() - queueQuery.dataUpdatedAt > STALE_AFTER_MS;
  const actionError =
    checkInMutation.error instanceof ApiError
      ? checkInMutation.error.message
      : checkInMutation.error
        ? 'We could not check you in. Try again.'
        : null;

  async function toggleAlerts(event: ChangeEvent<HTMLInputElement>) {
    const wanted = event.target.checked;
    setAlertsWanted(wanted);
    // Asked for here, on a deliberate click — never on page load, and never
    // again once the browser has answered.
    if (wanted && notification.permission === 'default') await notification.requestPermission();
  }

  return (
    <section className={styles.panel} aria-labelledby="queue-heading">
      <h2 className={styles.heading} id="queue-heading">
        {phaseHeading(queue)}
      </h2>

      {queue.phase === 'waiting' && queue.checkedInAt ? (
        <p className={styles.checkedIn}>Checked in at {formatSlotTime(queue.checkedInAt)}.</p>
      ) : null}

      <p className={styles.state} role="status" aria-live="polite">
        {queue.phase === 'not_open' ? notOpenDetail(queue, now) : queueDetail(queue)}
      </p>

      {stale && (
        <p className={styles.stale} role="status">
          This position is more than a minute old — the queue may have moved on.
        </p>
      )}

      <FormError message={actionError} />

      {canCheckIn(queue, now) && (
        <Button onClick={() => checkInMutation.mutate()} loading={checkInMutation.isPending}>
          {checkInMutation.isPending ? 'Checking you in…' : 'Check in'}
        </Button>
      )}

      {/* A denied permission is stated once and then left alone; the queue
          still updates on the page, which is the part that matters. */}
      {queue.phase === 'waiting' && notification.permission !== 'unsupported' ? (
        notification.canRequest ? (
          <label className={styles.alerts}>
            <input type="checkbox" checked={alertsWanted} onChange={toggleAlerts} />
            Alert me when I am close to the front
          </label>
        ) : notification.permission === 'denied' ? (
          <p className={styles.notice}>
            Browser alerts are turned off for this site, so we will not ask again. Your queue position still updates here.
          </p>
        ) : (
          <p className={styles.notice}>You will get a browser alert when you are close to the front.</p>
        )
      ) : null}
    </section>
  );
}
