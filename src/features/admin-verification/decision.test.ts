import { describe, expect, it } from 'vitest';
import {
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  decisionConsequence,
  decisionLabel,
  normaliseReason,
  statusAfterDecision,
  validateReason,
} from './decision';

describe('normaliseReason', () => {
  it('collapses whitespace and trims', () => {
    expect(normaliseReason('  multi\n\nline   reason  ')).toBe('multi line reason');
  });
});

describe('validateReason — required for both decisions', () => {
  it('rejects empty and too-short reasons with an explanation', () => {
    expect(validateReason('')).toMatch(/at least 10/);
    expect(validateReason('nope')).toMatch(/at least 10/);
    expect(validateReason('a'.repeat(REASON_MIN_LENGTH - 1))).not.toBeNull();
  });

  it('rejects reasons past the audit trail budget', () => {
    expect(validateReason('a'.repeat(REASON_MAX_LENGTH + 1))).toMatch(/500 characters or fewer/);
  });

  it('accepts a normalised reason in range', () => {
    expect(validateReason('  Credentials verified against the register.  ')).toBeNull();
  });
});

describe('decision copy', () => {
  it('labels approve and reject', () => {
    expect(decisionLabel('verified')).toBe('Approve');
    expect(decisionLabel('rejected')).toBe('Reject');
  });

  it('states the PRD consequence of each decision', () => {
    expect(decisionConsequence('verified')).toMatch(/visible in patient search/);
    expect(decisionConsequence('rejected')).toMatch(/keeps this doctor out of patient search/);
  });
});

describe('statusAfterDecision', () => {
  it('is a no-op when the profile already has the status', () => {
    expect(statusAfterDecision('verified', 'verified')).toBe('verified');
    expect(statusAfterDecision('pending', 'verified')).toBe('verified');
    expect(statusAfterDecision('verified', 'rejected')).toBe('rejected');
  });
});
