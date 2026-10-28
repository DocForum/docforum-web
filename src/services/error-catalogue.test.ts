import { describe, expect, it } from 'vitest';
import { ApiError, NETWORK_ERROR_CODE } from './api-client';
import { UNKNOWN_ERROR_CODE, describeError, knownErrorCodes, supportReference } from './error-catalogue';

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
