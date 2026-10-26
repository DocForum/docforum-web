import { ApiError } from '../../services/api-client';

export type ReferralAction = 'reassign' | 'cancel';

export interface ActionFailure {
  /**
   * `conflict` — someone else got there first (or the referral is no longer
   * pending): the dialog closes and the queue refetches.
   * `rejected` — docforum-core refused this particular request; the admin
   * can change it and resubmit.
   * `unconfirmed` — we never heard back. Retrying is safe: the request
   * carries `expectedUpdatedAt`, so a duplicate comes back as a conflict.
   */
  kind: 'conflict' | 'rejected' | 'auth' | 'unconfirmed';
  message: string;
}

const NOUNS: Record<ReferralAction, string> = {
  reassign: 'reassignment',
  cancel: 'cancellation',
};

export function describeActionError(error: unknown, action: ReferralAction): ActionFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message:
          'This referral changed while you were working on it — another admin, the doctor or the patient acted on it ' +
          'first. Nothing was changed by you; the queue has been refreshed.',
      };
    }
    if (error.status === 400 || error.status === 422) {
      return { kind: 'rejected', message: `docforum-core refused the ${NOUNS[action]}: ${error.message}` };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message: 'Your session no longer has admin access. Sign in again with an admin account.' };
    }
  }
  return {
    kind: 'unconfirmed',
    message: `Couldn't confirm the ${NOUNS[action]} — the preview backend may be waking up. Try again; if the first attempt went through you'll be told, it won't be applied twice.`,
  };
}

export function describeQueueError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again with an admin account.';
    }
    if (error.status === 404) {
      return "docforum-core doesn't serve the stuck-referral queue yet (docforum-core#68).";
    }
  }
  return "Couldn't load stuck referrals. The preview backend may be waking up — try again in a minute.";
}
