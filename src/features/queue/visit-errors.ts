import { ApiError } from '../../services/api-client';
import type { Translate } from '../../i18n/useT';

export type VisitAction = 'start' | 'complete';

/**
 * docforum-core answers `409` when the visit is not in a state that allows the
 * transition (not scheduled, not checked in, not in progress). That is a
 * statement about the patient's current state, not a network problem, so the
 * message says what to check instead of asking the doctor to retry blindly.
 */
export function visitErrorMessage(t: Translate, error: unknown, action: VisitAction): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return action === 'start'
        ? t(
            'queue.error.notCheckedIn',
            "This visit can't be started: the patient isn't checked in, or the appointment isn't scheduled for today. Refresh the queue to see the current status.",
          )
        : t(
            'queue.error.notInProgress',
            "This visit can't be completed: it isn't in progress yet. Refresh the queue to see the current status.",
          );
    }
    if (error.status === 404) {
      return t(
        'queue.error.notFound',
        'This appointment is no longer in your queue. Refresh to see today’s appointments.',
      );
    }
    if (error.status === 401 || error.status === 403) {
      return t(
        'queue.error.forbidden',
        'Your session no longer has access to this queue. Sign in again.',
      );
    }
  }
  return t(
    'queue.error.generic',
    'The queue could not be updated. Your change was rolled back — refresh and try again.',
  );
}
