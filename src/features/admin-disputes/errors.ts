import { ApiError } from '../../services/api-client';
import { identityTranslate } from '../../i18n/useT';
import type { Translate } from '../../i18n/useT';

export function describeDisputeQueueError(
  error: unknown,
  t: Translate = identityTranslate,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t(
        'admin.common.adminAccessLost',
        'Your session no longer has admin access. Sign in again with an admin account.',
      );
    }
    if (error.status === 404) {
      return t(
        'admin.disputes.queueNotServed',
        "docforum-core doesn't serve the fulfilment-dispute queue yet (docforum-core#76).",
      );
    }
  }
  return t(
    'admin.disputes.queueLoadError',
    "Couldn't load disputes. The preview backend may be waking up — try again in a minute.",
  );
}

export function describeDisputeDetailError(
  error: unknown,
  t: Translate = identityTranslate,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t(
        'admin.common.adminAccessLost',
        'Your session no longer has admin access. Sign in again with an admin account.',
      );
    }
    if (error.status === 404) {
      return t(
        'admin.disputes.detailNotFound',
        'This dispute no longer exists, or docforum-core does not serve it yet. Return to the queue.',
      );
    }
  }
  return t(
    'admin.disputes.detailLoadError',
    "Couldn't load this dispute. The preview backend may be waking up — try again in a minute.",
  );
}

export type ResolutionFailureKind = 'conflict' | 'rejected' | 'auth' | 'unconfirmed';

export interface ResolutionFailure {
  kind: ResolutionFailureKind;
  message: string;
}

/**
 * A resolution is final and is not replayable: a 409/404 means someone else
 * already resolved this dispute, so the detail must be refetched rather than
 * resubmitted. A network failure is honest about being unconfirmed — the
 * request may have landed, and reopening the queue will show the outcome.
 */
export function describeResolutionError(
  error: unknown,
  t: Translate = identityTranslate,
): ResolutionFailure {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message: t(
          'admin.disputes.resolutionConflict',
          'This dispute changed while you were working on it — another admin resolved it first. Nothing was changed by you; the dispute has been reloaded.',
        ),
      };
    }
    if (error.status === 400 || error.status === 422) {
      return {
        kind: 'rejected',
        message: t(
          'admin.disputes.resolutionRejected',
          'docforum-core refused the resolution: {message}',
          { message: error.message },
        ),
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        kind: 'auth',
        message: t(
          'admin.common.adminAccessLost',
          'Your session no longer has admin access. Sign in again with an admin account.',
        ),
      };
    }
  }
  return {
    kind: 'unconfirmed',
    message: t(
      'admin.disputes.resolutionUnconfirmed',
      "Couldn't confirm the resolution — the preview backend may be waking up. It may or may not have been applied; close this dialog and reload the dispute to check before trying again.",
    ),
  };
}

export function describeAttachmentError(
  error: unknown,
  t: Translate = identityTranslate,
): string {
  if (error instanceof ApiError && error.status === 404) {
    return t(
      'admin.disputes.attachmentGone',
      'This attachment is no longer available. Ask the facility to resubmit it.',
    );
  }
  return t(
    'admin.disputes.attachmentError',
    "Couldn't get a fresh link for this attachment. Check your connection and try again.",
  );
}
