import { ApiError } from '../../services/api-client';
import type { ClaimDecision } from '../../types/models';

export function describeQueueError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again with an admin account.';
    }
    if (error.status === 404) {
      return "docforum-core doesn't serve the verification queue yet — approving and rejecting works, but the pending list does not.";
    }
  }
  return "Couldn't load the verification queue. The preview backend may be waking up — try again in a minute.";
}

export function describeDetailError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again with an admin account.';
    }
    if (error.status === 404) {
      return 'This doctor no longer exists, or docforum-core does not serve verification details yet. Return to the queue.';
    }
  }
  return "Couldn't load this application. The preview backend may be waking up — try again in a minute.";
}

export type DecisionFailureKind = 'conflict' | 'rejected' | 'auth' | 'unknown';

export interface DecisionFailure {
  kind: DecisionFailureKind;
  message: string;
}

/**
 * A decision is a status flip: `409`/`404` means another admin decided first
 * (or the doctor is gone), so the dialog closes and the record reloads rather
 * than overwriting. `400`/`422` keep the dialog open with the server's
 * message. A network failure is reported honestly — but unlike a resolution,
 * retrying a flip is idempotent (setting the status a profile already has is
 * a no-op in docforum-core), so the admin may simply try again.
 */
export function describeDecisionError(error: unknown): DecisionFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message:
          'Another admin reviewed this doctor first — nothing was changed by you. The application has been reloaded ' +
          'so you can see the decision that was made.',
      };
    }
    if (error.status === 400 || error.status === 422) {
      return { kind: 'rejected', message: `docforum-core refused the decision: ${error.message}` };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message: 'Your session no longer has admin access. Sign in again with an admin account.' };
    }
  }
  return {
    kind: 'unknown',
    message:
      "Couldn't confirm the decision — the preview backend may be waking up. Try again; if it went through, " +
      'the application will show the recorded status.',
  };
}

export function describeDocumentError(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'This document is no longer available. Ask the doctor to resubmit their credentials.';
  }
  return "Couldn't get a fresh link for this document. Check your connection and try again.";
}

/** The decision history is read from the real audit trail; if that call
 * fails the detail still works, so this says so instead of failing the page. */
export function describeHistoryError(error: unknown): string {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return 'Your session no longer has admin access, so the decision history is unavailable.';
  }
  return "Couldn't load the decision history. Everything else on this page is still current.";
}

// --- Specialty claims queue (issue #65) -------------------------------------
// `describeQueueError` above serves the doctor-verification queue (issue
// #64), whose 404 means something different (the list endpoint is missing
// but deciding works). The claims queue is entirely assumed pending
// docforum-core#51, so it gets its own 404 wording — one function can't say
// both things truthfully.

export function describeClaimsQueueError(error: unknown): string {
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

const REVIEW_NOUNS: Record<ClaimDecision, string> = {
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
      return {
        kind: 'rejected',
        message: `docforum-core refused the ${REVIEW_NOUNS[decision]}: ${error.message}`,
      };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message: 'Your session no longer has admin access. Sign in again with an admin account.' };
    }
  }
  return {
    kind: 'unconfirmed',
    message: `Couldn't confirm the ${REVIEW_NOUNS[decision]} — the preview backend may be waking up. Try again; if the first attempt went through you'll be told, it won't be applied twice.`,
  };
}
