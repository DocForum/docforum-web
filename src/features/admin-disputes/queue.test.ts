import { describe, expect, it } from 'vitest';
import {
  NOTE_MAX,
  ageTone,
  formatAge,
  formatFileSize,
  hoursSince,
  normaliseNote,
  paymentConsequence,
  sortByAge,
  validateNote,
} from './queue';
import type { FulfillmentDisputeSummary } from '../../types/models';

function dispute(overrides: Partial<FulfillmentDisputeSummary> = {}): FulfillmentDisputeSummary {
  return {
    id: 'dsp-1',
    orderId: 'ord-1',
    orderType: 'prescription',
    orderItemName: 'Demo medicine',
    patientName: 'Pat Placeholder',
    facilityId: 'fac-1',
    facilityName: 'Central Pharmacy',
    amountStroops: '500000000',
    asset: 'XLM',
    status: 'open',
    openedAt: '2026-10-10T09:00:00.000Z',
    updatedAt: '2026-10-16T09:00:00.000Z',
    reportExcerpt: 'Something was wrong.',
    attachmentCount: 1,
    ...overrides,
  };
}

describe('dispute queue helpers', () => {
  it('sorts the loaded pages oldest first', () => {
    const older = dispute({ id: 'older', openedAt: '2026-10-01T09:00:00.000Z' });
    const newer = dispute({ id: 'newer', openedAt: '2026-10-15T09:00:00.000Z' });
    expect(sortByAge([newer, older]).map((item) => item.id)).toEqual(['older', 'newer']);
  });

  it('shows hours for the first two days and whole days after', () => {
    expect(hoursSince('2026-10-19T09:00:00.000Z', Date.parse('2026-10-19T10:30:00.000Z'))).toBe(1);
    expect(formatAge(0)).toBe('under 1 h');
    expect(formatAge(5)).toBe('5 h');
    expect(formatAge(50)).toBe('2 d 2 h');
    expect(formatAge(8 * 24)).toBe('8 days');
    expect(hoursSince('not-a-date', Date.now())).toBeNull();
  });

  it('escalates urgency earlier than the referral queue, because money is held', () => {
    expect(ageTone(2)).toBe('elevated');
    expect(ageTone(24)).toBe('high');
    expect(ageTone(72)).toBe('critical');
  });

  it('states the exact payment consequence for each side', () => {
    const facility = paymentConsequence(dispute(), 'facility');
    expect(facility.headline).toBe('Release 50 XLM to Central Pharmacy');
    expect(facility.detail).toMatch(/releases the escrowed payment to the facility/i);
    expect(facility.detail).toMatch(/cannot be reversed/i);
    expect(facility.summary).toBe('50 XLM released to Central Pharmacy');

    const patient = paymentConsequence(dispute(), 'patient');
    expect(patient.headline).toBe('Refund 50 XLM to Pat Placeholder');
    expect(patient.detail).toMatch(/refunds the escrowed payment to the patient/i);
    expect(patient.detail).toMatch(/facility is not paid/i);
    expect(patient.summary).toBe('50 XLM refunded to Pat Placeholder');
  });

  it('formats USDC amounts with the same stroop precision', () => {
    expect(paymentConsequence(dispute({ asset: 'USDC', amountStroops: '12300000' }), 'facility').headline).toBe(
      'Release 1.23 USDC to Central Pharmacy',
    );
  });

  it('requires a note of 10–1000 characters after collapsing whitespace', () => {
    expect(normaliseNote('  checked   the   log \n')).toBe('checked the log');
    expect(validateNote('too short')).toMatch(/at least 10/);
    expect(validateNote('long enough to count')).toBeNull();
    expect(validateNote('x'.repeat(NOTE_MAX + 1))).toMatch(/under 1000/);
  });

  it('formats attachment sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(184320)).toBe('180 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
