import { describe, expect, it } from 'vitest';
import { normaliseReason, validateReason } from './reason';
import { describeClaimsQueueError, describeReviewError } from './errors';
import { ApiError } from '../../services/api-client';

describe('validateReason', () => {
  it('requires a reason when rejecting — the doctor is told what to fix', () => {
    expect(validateReason('', true)).toBe('Give a reason — the doctor is told what to fix or resubmit.');
    expect(validateReason('   ', true)).toMatch(/Give a reason/);
    expect(validateReason('too short', true)).toBe('Write at least 10 characters.');
    expect(validateReason('x'.repeat(501), true)).toBe('Keep it under 500 characters.');
    expect(validateReason('Upload your cardiology board certification.', true)).toBeNull();
  });

  it('allows an empty reason when approving, but still caps a provided note', () => {
    expect(validateReason('', false)).toBeNull();
    expect(validateReason('checked the certificate', false)).toBeNull();
    expect(validateReason('x'.repeat(501), false)).toBe('Keep it under 500 characters.');
  });
});

describe('normaliseReason', () => {
  it('collapses pasted newlines and extra whitespace', () => {
    expect(normaliseReason('  what to  upload\n\nand why \n')).toBe('what to upload and why');
  });
});

describe('describeReviewError', () => {
  it('treats 409/404 as someone-else-acted conflicts', () => {
    for (const status of [409, 404]) {
      const outcome = describeReviewError(new ApiError('Conflict', status), 'reject');
      expect(outcome.kind).toBe('conflict');
      expect(outcome.message).toMatch(/another admin reviewed it, or the doctor edited or withdrew it/);
    }
  });

  it('keeps 400/422 open for the admin to change and resubmit', () => {
    const outcome = describeReviewError(new ApiError('too short', 422), 'reject');
    expect(outcome.kind).toBe('rejected');
    expect(outcome.message).toBe('docforum-core refused the rejection: too short');
  });

  it('flags lost admin sessions', () => {
    expect(describeReviewError(new ApiError('Forbidden', 403), 'approve').kind).toBe('auth');
  });

  it('calls an unknown failure unconfirmed but safe to retry', () => {
    const outcome = describeReviewError(new TypeError('Failed to fetch'), 'approve');
    expect(outcome.kind).toBe('unconfirmed');
    expect(outcome.message).toMatch(/won't be applied twice/);
  });
});

describe('describeClaimsQueueError', () => {
  it('explains a 404 as the backend issue not landed yet', () => {
    expect(describeClaimsQueueError(new ApiError('Not Found', 404))).toMatch(/docforum-core#51/);
  });

  it('explains lost admin sessions and transient failures', () => {
    expect(describeClaimsQueueError(new ApiError('Unauthorized', 401))).toMatch(/no longer has admin access/);
    expect(describeClaimsQueueError(new TypeError('Failed to fetch'))).toMatch(/waking up/);
  });
});
