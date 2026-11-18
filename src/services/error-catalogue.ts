// Single mapping from docforum-core error codes to user-facing copy and a
// recovery action. The backend catalogue is docforum-core#115; this module is
// the only place the UI decides what a code means (issue #84).
//
// Rules:
// - Never render the server's `message` — it can leak internal detail.
// - Unknown codes fall back to a generic message plus a support reference
//   (the request id when the backend supplied one).
// - Messages are ICU message ids + English defaults so the catalogue can be
//   translated (see src/i18n/messages/en.json).
import { ApiError, NETWORK_ERROR_CODE } from './api-client';

export type ErrorAction =
  | 'retry'
  | 'reauthenticate'
  | 'edit_time'
  | 'fix_input'
  | 'wait'
  | 'contact_support'
  | 'none';

export interface ErrorDescriptor {
  /** Canonical backend code, or `UNKNOWN_ERROR` for unmapped failures. */
  code: string;
  messageId: string;
  defaultMessage: string;
  action: ErrorAction;
  actionMessageId?: string;
  defaultActionMessage?: string;
}

export const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';

type Entry = Omit<ErrorDescriptor, 'code'>;

const FALLBACK: Entry = {
  messageId: 'errors.unknown',
  defaultMessage: 'Something went wrong. Please try again, or contact support if it keeps happening.',
  action: 'contact_support',
  actionMessageId: 'errors.actions.contactSupport',
  defaultActionMessage: 'Contact support',
};

const CATALOGUE: Record<string, Entry> = {
  // Input / credentials
  VALIDATION_FAILED: {
    messageId: 'errors.validationFailed',
    defaultMessage: 'Some details need fixing. Check the highlighted fields and try again.',
    action: 'fix_input',
    actionMessageId: 'errors.actions.reviewFields',
    defaultActionMessage: 'Review fields',
  },
  INVALID_CREDENTIALS: {
    messageId: 'errors.invalidCredentials',
    defaultMessage: 'That email and password combination is not right. Try again.',
    action: 'retry',
    actionMessageId: 'errors.actions.retry',
    defaultActionMessage: 'Try again',
  },
  WRONG_PASSWORD: {
    messageId: 'errors.wrongPassword',
    defaultMessage: 'That password is not right. Try again.',
    action: 'retry',
    actionMessageId: 'errors.actions.retry',
    defaultActionMessage: 'Try again',
  },
  EMAIL_TAKEN: {
    messageId: 'errors.emailTaken',
    defaultMessage: 'An account with that email already exists. Sign in instead.',
    action: 'none',
  },
  PASSWORD_TOO_WEAK: {
    messageId: 'errors.passwordTooWeak',
    defaultMessage: 'Choose a longer password — at least 8 characters.',
    action: 'fix_input',
    actionMessageId: 'errors.actions.reviewFields',
    defaultActionMessage: 'Review fields',
  },

  // Session / authorisation
  UNAUTHENTICATED: {
    messageId: 'errors.unauthenticated',
    defaultMessage: 'Your session has ended. Sign in again to continue.',
    action: 'reauthenticate',
    actionMessageId: 'errors.actions.signIn',
    defaultActionMessage: 'Sign in',
  },
  TOKEN_EXPIRED: {
    messageId: 'errors.tokenExpired',
    defaultMessage: 'Your session has expired. Sign in again to continue.',
    action: 'reauthenticate',
    actionMessageId: 'errors.actions.signIn',
    defaultActionMessage: 'Sign in',
  },
  FORBIDDEN: {
    messageId: 'errors.forbidden',
    defaultMessage: 'You do not have permission to do that.',
    action: 'none',
  },
  NOT_FOUND: {
    messageId: 'errors.notFound',
    defaultMessage: 'We could not find that. It may have been removed or you may not have access.',
    action: 'none',
  },
  CONFLICT: {
    messageId: 'errors.conflict',
    defaultMessage: 'That conflicts with the current state. Refresh, then try again.',
    action: 'retry',
    actionMessageId: 'errors.actions.refresh',
    defaultActionMessage: 'Refresh',
  },

  // Booking
  SLOT_TAKEN: {
    messageId: 'errors.slotTaken',
    defaultMessage: 'That time was just booked by someone else. Pick another time.',
    action: 'edit_time',
    actionMessageId: 'errors.actions.pickAnotherTime',
    defaultActionMessage: 'Pick another time',
  },
  BOOKING_IN_PAST: {
    messageId: 'errors.bookingInPast',
    defaultMessage: 'That time has already passed. Pick a future time.',
    action: 'edit_time',
    actionMessageId: 'errors.actions.pickAnotherTime',
    defaultActionMessage: 'Pick another time',
  },

  // Availability / limits
  RATE_LIMITED: {
    messageId: 'errors.rateLimited',
    defaultMessage: 'Too many attempts. Wait a moment, then try again.',
    action: 'wait',
    actionMessageId: 'errors.actions.retry',
    defaultActionMessage: 'Try again',
  },
  SERVICE_UNAVAILABLE: {
    messageId: 'errors.serviceUnavailable',
    defaultMessage: 'DocForum is temporarily unavailable. Try again in a moment.',
    action: 'retry',
    actionMessageId: 'errors.actions.retry',
    defaultActionMessage: 'Try again',
  },
  NETWORK_ERROR: {
    messageId: 'errors.network',
    defaultMessage: 'We could not reach DocForum. Check your connection and try again.',
    action: 'retry',
    actionMessageId: 'errors.actions.retry',
    defaultActionMessage: 'Try again',
  },
  INTERNAL_ERROR: {
    messageId: 'errors.internal',
    defaultMessage: 'Something went wrong on our side. We have logged it — try again in a moment.',
    action: 'retry',
    actionMessageId: 'errors.actions.retry',
    defaultActionMessage: 'Try again',
  },

  // Dependents / handover
  HANDOVER_NOT_ELIGIBLE: {
    messageId: 'errors.handoverNotEligible',
    defaultMessage: 'Account handover only opens when the dependent reaches the age of majority.',
    action: 'none',
  },
  INVITE_EXPIRED: {
    messageId: 'errors.inviteExpired',
    defaultMessage: 'That invitation has expired. Ask for a new one.',
    action: 'none',
  },

  // Health records
  HEALTH_ENTRY_CONFLICT: {
    messageId: 'errors.healthEntryConflict',
    defaultMessage: 'This entry changed since you opened it. Refresh, then try again.',
    action: 'retry',
    actionMessageId: 'errors.actions.refresh',
    defaultActionMessage: 'Refresh',
  },

  // Facility team
  LAST_OWNER: {
    messageId: 'errors.lastOwner',
    defaultMessage: 'A facility needs at least one owner. Promote another member before removing this one.',
    action: 'none',
  },

  // Account lifecycle
  ACCOUNT_DELETE_BLOCKED: {
    messageId: 'errors.accountDeleteBlocked',
    defaultMessage: 'Your account cannot be deleted while orders or funded payments are still active.',
    action: 'none',
  },

  // Consultation
  CONSULTATION_NOTE_SIGNED: {
    messageId: 'errors.consultationNoteSigned',
    defaultMessage: 'This note is signed and can no longer be edited. Add an addendum instead.',
    action: 'none',
  },

  // Payments
  PAYMENT_FAILED: {
    messageId: 'errors.paymentFailed',
    defaultMessage: 'The payment did not go through. Try again.',
    action: 'retry',
    actionMessageId: 'errors.actions.retry',
    defaultActionMessage: 'Try again',
  },
  ESCROW_STATE_INVALID: {
    messageId: 'errors.escrowStateInvalid',
    defaultMessage: 'This payment has already moved on. Refresh to see its current state.',
    action: 'retry',
    actionMessageId: 'errors.actions.refresh',
    defaultActionMessage: 'Refresh',
  },
  WALLET_ALREADY_LINKED: {
    messageId: 'errors.walletAlreadyLinked',
    defaultMessage: 'A wallet is already linked to this facility.',
    action: 'none',
  },
};

/** HTTP-status fallback when the backend did not send a code. */
const STATUS_CODES: Record<number, string> = {
  0: NETWORK_ERROR_CODE,
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'SERVICE_UNAVAILABLE',
  503: 'SERVICE_UNAVAILABLE',
  504: 'SERVICE_UNAVAILABLE',
};

export function isKnownErrorCode(code: string | null | undefined): code is string {
  return Boolean(code && CATALOGUE[code]);
}

/**
 * Turn any thrown value into a descriptor safe to render.
 *
 * Unknown codes intentionally lose their server message: they get the generic
 * fallback plus a support reference (`describeError(...).code` stays
 * `UNKNOWN_ERROR`; use `supportReference()` for the id to quote).
 */
export function describeError(error: unknown): ErrorDescriptor {
  if (error instanceof ApiError) {
    const direct = error.code ?? STATUS_CODES[error.status] ?? null;
    const entry = direct ? CATALOGUE[direct] : undefined;
    if (entry && direct) return { code: direct, ...entry };
    return { code: UNKNOWN_ERROR_CODE, ...FALLBACK };
  }
  return { code: UNKNOWN_ERROR_CODE, ...FALLBACK };
}

/** Support reference to show with unknown errors — the backend request id. */
export function supportReference(error: unknown): string | null {
  if (error instanceof ApiError && error.requestId) return error.requestId;
  return null;
}

/** Codes the UI knows how to explain — used by tests and docs. */
export function knownErrorCodes(): string[] {
  return Object.keys(CATALOGUE).sort();
}
