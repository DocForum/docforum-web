import { describe, expect, it } from 'vitest';
import { ApiError, NETWORK_ERROR_CODE } from './api-client';
import {
  UNKNOWN_ERROR_CODE,
  describeError,
  isKnownErrorCode,
  knownErrorCodes,
  supportReference,
} from './error-catalogue';

/**
 * Complete list of error codes documented in docforum-core's `docs/api/README.md`.
 * A test guards that every code in this checked-in list has an entry in error-catalogue.ts.
 */
export const CORE_DOCUMENTED_ERROR_CODES = [
  'ACCOUNT_DELETE_BLOCKED',
  'BOOKING_IN_PAST',
  'CONFLICT',
  'CONSULTATION_NOTE_SIGNED',
  'DEPENDENT_NOT_A_MINOR',
  'EMAIL_ALREADY_VERIFIED',
  'EMAIL_NOT_VERIFIED',
  'EMAIL_TAKEN',
  'EMAIL_VERIFICATION_RATE_LIMITED',
  'ESCROW_SDK_PREPARE_UNSUPPORTED',
  'ESCROW_STATE_INVALID',
  'EXPORT_EXPIRED',
  'EXPORT_NOT_READY',
  'FACILITY_WALLET_NOT_LINKED',
  'FEATURE_DISABLED',
  'FORBIDDEN',
  'GENERATION_FAILED',
  'GENERATION_TIMEOUT',
  'GUARDIANSHIP_INACTIVE',
  'HANDOVER_NOT_ELIGIBLE',
  'HEALTH_ENTRY_CONFLICT',
  'INTERNAL_ERROR',
  'INVALID_CREDENTIALS',
  'INVALID_CURSOR',
  'INVALID_VERIFICATION_TOKEN',
  'INVITE_EXPIRED',
  'LAB_ORDER_SUPERSEDED',
  'LAB_RESULT_ALREADY_ATTACHED',
  'LAB_RESULT_CONTENT_MISMATCH',
  'LAB_RESULT_NOT_FOUND',
  'LAB_RESULT_TOO_LARGE',
  'LAB_RESULT_UNSUPPORTED_TYPE',
  'LAST_OWNER',
  'NETWORK_ERROR',
  'NOT_FOUND',
  'OBJECT_STORAGE_NOT_CONFIGURED',
  'PASSWORD_CONFIRMATION_FAILED',
  'PASSWORD_TOO_WEAK',
  'PAYEE_TRUSTLINE_MISSING',
  'PAYMENT_FAILED',
  'PRICE_ON_REQUEST',
  'RATE_LIMITED',
  'REFERRAL_NO_ELIGIBLE_TARGET',
  'SECTION_FAILED',
  'SERVICE_UNAVAILABLE',
  'SLOT_TAKEN',
  'TOKEN_EXPIRED',
  'UNAUTHENTICATED',
  'VALIDATION_FAILED',
  'VERIFICATION_TOKEN_EXPIRED',
  'WALLET_ALREADY_LINKED',
  'WALLET_NOT_LINKED',
  'WRONG_PASSWORD',
] as const;

describe('error catalogue', () => {
  it('maps a known backend code to its user-facing message and recovery action', () => {
    const error = new ApiError('slot 4 is already booked by another patient', 409, undefined, {
      code: 'SLOT_TAKEN',
      requestId: 'req-123',
    });

    const descriptor = describeError(error);

    expect(descriptor.code).toBe('SLOT_TAKEN');
    expect(descriptor.messageId).toBe('errors.slotTaken');
    expect(descriptor.defaultMessage).toMatch(/pick another time/i);
    expect(descriptor.action).toBe('edit_time');
    expect(descriptor.defaultActionMessage).toMatch(/pick another time/i);
    // The raw server message never becomes display copy.
    expect(descriptor.defaultMessage).not.toContain('slot 4');
    expect(descriptor.defaultMessage).not.toContain('another patient');
  });

  it('maps EMAIL_NOT_VERIFIED to resend verification guidance action', () => {
    const error = new ApiError('Must verify email to perform mutations', 403, undefined, {
      code: 'EMAIL_NOT_VERIFIED',
    });

    const descriptor = describeError(error);

    expect(descriptor.code).toBe('EMAIL_NOT_VERIFIED');
    expect(descriptor.messageId).toBe('errors.emailNotVerified');
    expect(descriptor.action).toBe('resend_verification');
    expect(descriptor.defaultActionMessage).toMatch(/resend verification/i);
    expect(descriptor.defaultMessage).not.toContain('Must verify email');
  });

  it('maps INVALID_CURSOR to reload list action', () => {
    const error = new ApiError('Malformed base64 cursor token at 0xdeadbeef', 400, undefined, {
      code: 'INVALID_CURSOR',
    });

    const descriptor = describeError(error);

    expect(descriptor.code).toBe('INVALID_CURSOR');
    expect(descriptor.messageId).toBe('errors.invalidCursor');
    expect(descriptor.action).toBe('reload');
    expect(descriptor.defaultActionMessage).toMatch(/reload list/i);
    expect(descriptor.defaultMessage).not.toContain('0xdeadbeef');
  });

  it('maps WALLET_NOT_LINKED to link wallet action', () => {
    const error = new ApiError('Patient wallet GXXXX not found', 409, undefined, {
      code: 'WALLET_NOT_LINKED',
    });

    const descriptor = describeError(error);

    expect(descriptor.code).toBe('WALLET_NOT_LINKED');
    expect(descriptor.messageId).toBe('errors.walletNotLinked');
    expect(descriptor.action).toBe('fix_input');
    expect(descriptor.defaultActionMessage).toMatch(/link wallet/i);
    expect(descriptor.defaultMessage).not.toContain('GXXXX');
  });

  it('maps lab result error codes to actionable messages without raw leaks', () => {
    const tooLarge = describeError(
      new ApiError('File 15200388 bytes exceeds max 10485760', 413, undefined, {
        code: 'LAB_RESULT_TOO_LARGE',
      }),
    );
    expect(tooLarge.code).toBe('LAB_RESULT_TOO_LARGE');
    expect(tooLarge.action).toBe('fix_input');
    expect(tooLarge.defaultActionMessage).toMatch(/choose another file/i);
    expect(tooLarge.defaultMessage).not.toContain('15200388');

    const unsupported = describeError(
      new ApiError('MIME type application/x-sh not allowed', 415, undefined, {
        code: 'LAB_RESULT_UNSUPPORTED_TYPE',
      }),
    );
    expect(unsupported.code).toBe('LAB_RESULT_UNSUPPORTED_TYPE');
    expect(unsupported.action).toBe('fix_input');
    expect(unsupported.defaultActionMessage).toMatch(/choose another file/i);
    expect(unsupported.defaultMessage).not.toContain('application/x-sh');
  });

  it('guards that every error code documented in core docs has a catalogue entry', () => {
    const known = new Set(knownErrorCodes());
    const missing = CORE_DOCUMENTED_ERROR_CODES.filter((code) => !known.has(code));

    expect(missing).toEqual([]);
    for (const code of CORE_DOCUMENTED_ERROR_CODES) {
      expect(isKnownErrorCode(code)).toBe(true);
      const descriptor = describeError(new ApiError('internal detail', 400, undefined, { code }));
      expect(descriptor.code).toBe(code);
      expect(descriptor.messageId).toMatch(/^errors\./);
      expect(descriptor.defaultMessage.length).toBeGreaterThan(0);
      expect(descriptor.defaultMessage).not.toContain('internal detail');
      if (descriptor.action !== 'none') {
        expect(descriptor.actionMessageId).toMatch(/^errors\.actions\./);
        expect(descriptor.defaultActionMessage?.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to a generic message for unknown codes and keeps the request id as a support reference', () => {
    const error = new ApiError('internal stack trace detail', 500, undefined, {
      code: 'SOMETHING_NEW',
      requestId: 'req-support-9',
    });

    const descriptor = describeError(error);

    expect(descriptor.code).toBe(UNKNOWN_ERROR_CODE);
    expect(descriptor.messageId).toBe('errors.unknown');
    expect(descriptor.defaultMessage).not.toContain('stack trace');
    expect(descriptor.action).toBe('contact_support');
    expect(supportReference(error)).toBe('req-support-9');
  });

  it('uses HTTP status as a fallback when no code is present', () => {
    expect(describeError(new ApiError('nope', 401)).code).toBe('UNAUTHENTICATED');
    expect(describeError(new ApiError('nope', 429)).code).toBe('RATE_LIMITED');
    expect(describeError(new ApiError('down', 503)).action).toBe('retry');
  });

  it('maps network failures (never reached the backend) to a retryable message', () => {
    const error = new ApiError('Failed to fetch', 0, undefined, { code: NETWORK_ERROR_CODE });

    const descriptor = describeError(error);

    expect(descriptor.messageId).toBe('errors.network');
    expect(descriptor.action).toBe('retry');
    expect(supportReference(error)).toBeNull();
  });

  it('treats non-API render errors as unknown rather than exposing their message', () => {
    const descriptor = describeError(new Error('Cannot read properties of undefined (reading "x")'));

    expect(descriptor.code).toBe(UNKNOWN_ERROR_CODE);
    expect(descriptor.defaultMessage).not.toContain('Cannot read properties');
  });

  it('exposes the codes it knows for documentation/tests', () => {
    expect(knownErrorCodes()).toEqual(expect.arrayContaining(['SLOT_TAKEN', 'UNAUTHENTICATED', 'NETWORK_ERROR']));
    // Every mapping is stable/sorted so diffs in docs and tests are readable.
    expect(knownErrorCodes()).toEqual([...knownErrorCodes()].sort());
  });
});
