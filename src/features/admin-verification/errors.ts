import { ApiError } from '../../services/api-client';
import type { ClaimDecision } from '../../types/models';

export interface ReviewFailure {
  /**
   * `conflict` — someone else reviewed the claim first (or it left the
   * queue): the dialog closes and the queue refetches.
   * `rejected` — docforum-core refused this particular request; the admin
   * can change it and resubmit.
   * `unconfirmed` — we never heard back. Retrying is safe: the request
   * carries `expectedUpdatedAt`, so a duplicate comes back as a conflict.
   */
  kind: 'conflict' | 'rejected' | 'auth' | 'unconfirmed';
  message: string;
}

const NOUNS: Record<ClaimDecision, string> = {
  approve: 'approval',
  reject: 'rejection',
};

export function describeReviewError(error: unknown, decision: ClaimDecision): ReviewFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message:
          'This claim changed while you were working on it — another admin reviewed it, or the doctor edited or ' +
          'withdrew it. Nothing was changed by you; the queue has been refreshed.',
      };
    }
    if (error.status === 400 || error.status === 422) {
      return { kind: 'rejected', message: `docforum-core refused the ${NOUNS[decision]}: ${error.message}` };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message: 'Your session no longer has admin access. Sign in again with an admin account.' };
    }
  }
  return {
    kind: 'unconfirmed',
    message: `Couldn't confirm the ${NOUNS[decision]} — the preview backend may be waking up. Try again; if the first attempt went through you'll be told, it won't be applied twice.`,
  };
}

export function describeQueueError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again with an admin account.';
    }
    if (error.status === 404) {
      return "docforum-core doesn't serve per-specialty verification yet (docforum-core#51).";
    }
  }
  return "Couldn't load specialty claims. The preview backend may be waking up — try again in a minute.";
}
