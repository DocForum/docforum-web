import { describe, expect, it } from 'vitest';
import {
  consultationOutcomeDefaults,
  consultationOutcomeSchema,
} from './outcome-schema';

function parse(overrides: Record<string, unknown> = {}) {
  return consultationOutcomeSchema.safeParse({
    ...consultationOutcomeDefaults,
    ...overrides,
  });
}

function errorFor(field: string, overrides: Record<string, unknown> = {}) {
  const result = parse(overrides);
  if (result.success) return null;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message ?? null;
}

describe('consultationOutcomeSchema', () => {
  it('accepts a resolved outcome without extras', () => {
    expect(parse().success).toBe(true);
  });

  it('requires referral fields only when the outcome is referred', () => {
    expect(errorFor('specialty', { outcome: 'resolved' })).toBeNull();
    expect(errorFor('specialty', { outcome: 'referred' })).toBe(
      'Target specialty is required.',
    );
    expect(errorFor('referralReason', { outcome: 'referred' })).toBe(
      'Referral reason is required.',
    );
    expect(
      parse({
        outcome: 'referred',
        specialty: 'Cardiology',
        referralReason: 'Needs review.',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['zero', '0'],
    ['too large', '91'],
    ['fractional', '7.5'],
    ['not a number', 'soon'],
  ])('rejects a %s follow-up interval', (_label, value) => {
    expect(errorFor('followUpDays', { outcome: 'follow_up_needed', followUpDays: value })).toBe(
      'Enter a whole number of days between 1 and 90.',
    );
  });

  it('accepts whole-day follow-up intervals between 1 and 90', () => {
    expect(parse({ outcome: 'follow_up_needed', followUpDays: '1' }).success).toBe(true);
    expect(parse({ outcome: 'follow_up_needed', followUpDays: '90' }).success).toBe(true);
  });

  it('requires medication and dose for a prescription order', () => {
    expect(errorFor('medication', { wantsOrder: true })).toBe('Medication is required.');
    expect(errorFor('dose', { wantsOrder: true })).toBe('Dose is required.');
    expect(
      parse({ wantsOrder: true, medication: 'Amoxicillin', dose: '1 tablet daily' }).success,
    ).toBe(true);
  });

  it('requires a test name for a lab order', () => {
    expect(errorFor('testName', { wantsOrder: true, orderType: 'lab_order' })).toBe(
      'Test name is required.',
    );
    // Prescription fields do not block a lab order.
    expect(
      parse({ wantsOrder: true, orderType: 'lab_order', testName: 'Full blood count' }).success,
    ).toBe(true);
  });

  it('ignores order fields when no order is requested', () => {
    expect(
      parse({ wantsOrder: false, orderType: 'lab_order', testName: '' }).success,
    ).toBe(true);
  });

  it('treats whitespace-only required values as missing', () => {
    expect(
      errorFor('specialty', { outcome: 'referred', specialty: '   ' }),
    ).toBe('Target specialty is required.');
    expect(errorFor('medication', { wantsOrder: true, medication: '   ' })).toBe(
      'Medication is required.',
    );
  });
});
