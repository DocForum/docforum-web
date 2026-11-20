import type { AppointmentQueue } from '../../types/models';

/** The issue asks for an alert at "1–2 patients ahead". */
export const NOTIFY_AT_OR_BELOW = 2;

/** "Being seen" is worth an alert however long the queue looked a moment
 * ago — it is the state the whole feature exists to save waiting for. */
export function shouldNotify(queue: AppointmentQueue): boolean {
  if (queue.phase === 'being_seen') return true;
  return (
    queue.phase === 'waiting' &&
    queue.peopleAhead !== null &&
    queue.peopleAhead <= NOTIFY_AT_OR_BELOW
  );
}

/** Two identical reads must produce one alert, not one per poll — but a
 * position that moves 3 → 2 → 1 is three different states. */
export function queueSignature(queue: AppointmentQueue): string {
  return `${queue.phase}:${queue.peopleAhead ?? 'unknown'}`;
}

export function notificationBody(queue: AppointmentQueue): string {
  if (queue.phase === 'being_seen') return 'It is your turn now.';
  const ahead = queue.peopleAhead ?? 0;
  const wait = queue.estimatedWaitMinutes === null ? '' : ` — about ${queue.estimatedWaitMinutes} min (estimate)`;
  return `Only ${ahead} ahead of you${wait}.`;
}

/** The window is the backend's call. `not_open` with an opening time already
 * in the past just means the projection has not recomputed yet, so the
 * button is offered; a missing opening time means this backend has no window
 * at all and the panel is only ever rendered on the day of the visit. */
export function canCheckIn(queue: AppointmentQueue, now: Date): boolean {
  if (queue.checkedInAt) return false;
  if (queue.phase === 'completed') return false;
  if (queue.phase === 'waiting' || queue.phase === 'being_seen') return true;
  return queue.checkInOpensAt === null || new Date(queue.checkInOpensAt) <= now;
}
