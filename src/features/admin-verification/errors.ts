import { ApiError } from '../../services/api-client';
import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';
import type { ClaimDecision } from '../../types/models';

export function describeQueueError(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('adminVerification.errors.auth', 'Your session no longer has admin access. Sign in again with an admin account.');
    }
    if (error.status === 404) {
      return t(
        'adminVerification.errors.queueNotServed',
        "docforum-core doesn't serve the verification queue yet — approving and rejecting works, but the pending list does not.",
      );
    }
  }
  return t(
    'adminVerification.errors.queueLoad',
    "Couldn't load the verification queue. The preview backend may be waking up — try again in a minute.",
  );
}

export function describeDetailError(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('adminVerification.errors.auth', 'Your session no longer has admin access. Sign in again with an admin account.');
    }
    if (error.status === 404) {
      return t(
        'adminVerification.errors.detailNotFound',
        'This doctor no longer exists, or docforum-core does not serve verification details yet. Return to the queue.',
      );
    }
  }
  return t(
    'adminVerification.errors.detailLoad',
    "Couldn't load this application. The preview backend may be waking up — try again in a minute.",
  );
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
export function describeDecisionError(error: unknown, t: Translator = englishTranslator): DecisionFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message: t(
          'adminVerification.errors.decisionConflict',
          'Another admin reviewed this doctor first — nothing was changed by you. The application has been reloaded ' +
            'so you can see the decision that was made.',
        ),
      };
    }
    if (error.status === 400 || error.status === 422) {
      return {
        kind: 'rejected',
        message: t('adminVerification.errors.decisionRejected', 'docforum-core refused the decision: {message}', {
          message: error.message,
        }),
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        kind: 'auth',
        message: t('adminVerification.errors.auth', 'Your session no longer has admin access. Sign in again with an admin account.'),
      };
    }
  }
  return {
    kind: 'unknown',
    message: t(
      'adminVerification.errors.decisionUnconfirmed',
      "Couldn't confirm the decision — the preview backend may be waking up. Try again; if it went through, " +
        'the application will show the recorded status.',
    ),
  };
}

export function describeDocumentError(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError && error.status === 404) {
    return t(
      'adminVerification.errors.documentGone',
      'This document is no longer available. Ask the doctor to resubmit their credentials.',
    );
  }
  return t(
    'adminVerification.errors.documentLoad',
    "Couldn't get a fresh link for this document. Check your connection and try again.",
  );
}

/** The decision history is read from the real audit trail; if that call
 * fails the detail still works, so this says so instead of failing the page. */
export function describeHistoryError(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return t(
      'adminVerification.errors.historyForbidden',
      'Your session no longer has admin access, so the decision history is unavailable.',
    );
  }
  return t(
    'adminVerification.errors.historyLoad',
    "Couldn't load the decision history. Everything else on this page is still current.",
  );
}

// --- Specialty claims queue (issue #65) -------------------------------------
// `describeQueueError` above serves the doctor-verification queue (issue
// #64), whose 404 means something different (the list endpoint is missing
// but deciding works). The claims queue is entirely assumed pending
// docforum-core#51, so it gets its own 404 wording — one function can't say
// both things truthfully.

export function describeClaimsQueueError(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('adminVerification.errors.auth', 'Your session no longer has admin access. Sign in again with an admin account.');
    }
    if (error.status === 404) {
      return t(
        'adminVerification.errors.claimsNotServed',
        "docforum-core doesn't serve per-specialty verification yet (docforum-core#51).",
      );
    }
  }
  return t(
    'adminVerification.errors.claimsLoad',
    "Couldn't load specialty claims. The preview backend may be waking up — try again in a minute.",
  );
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

const REVIEW_NOUN_IDS: Record<ClaimDecision, { id: 'approve' | 'reject'; noun: string }> = {
  approve: { id: 'approve', noun: 'approval' },
  reject: { id: 'reject', noun: 'rejection' },
};

/** Translated with the sentence that carries it — see admin-referrals. */
function reviewNoun(decision: ClaimDecision, t: Translator): string {
  const { id, noun } = REVIEW_NOUN_IDS[decision];
  return t(`adminVerification.errors.noun.${id}`, noun);
}

export function describeReviewError(
  error: unknown,
  decision: ClaimDecision,
  t: Translator = englishTranslator,
): ReviewFailure {
  const { id } = REVIEW_NOUN_IDS[decision];
  const noun = reviewNoun(decision, t);
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message: t(
          'adminVerification.errors.reviewConflict',
          'This claim changed while you were working on it — another admin reviewed it, or the doctor edited or ' +
            'withdrew it. Nothing was changed by you; the queue has been refreshed.',
        ),
      };
    }
    if (error.status === 400 || error.status === 422) {
      return {
        kind: 'rejected',
        message: t('adminVerification.errors.reviewRejected', 'docforum-core refused the {noun}: {message}', {
          noun,
          message: error.message,
        }),
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        kind: 'auth',
        message: t('adminVerification.errors.auth', 'Your session no longer has admin access. Sign in again with an admin account.'),
      };
    }
  }
  return {
    kind: 'unconfirmed',
    message: t(
      `adminVerification.errors.reviewUnconfirmed.${id}`,
      "Couldn't confirm the {noun} — the preview backend may be waking up. Try again; if the first attempt went through you'll be told, it won't be applied twice.",
      { noun },
    ),
  };
}
