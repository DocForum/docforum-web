import { describe, expect, it } from 'vitest';
import {
  ageTone,
  hoursSince,
  oldestAgeLabel,
  reasonLabel,
  sortByAge,
} from './queue';
import {
  NOTES_MAX_LENGTH,
  normaliseNotes,
  resolutionConsequence,
  resolutionLabel,
  resolutionTitle,
  validateNotes,
} from './resolution';
import { ageLabel, attachmentKindLabel, expiryLabel, formatBytes } from './format';
import type { FulfillmentDispute, FulfillmentDisputeSummary } from '../../types/models';

function summary(id: string, openedAt: string): FulfillmentDisputeSummary {
  return {
    id,
    status: 'open',
    orderId: `ord-${id}`,
    orderType: 'prescription',
    itemName: `Item ${id}`,
    patientName: 'Pat Placeholder',
    facility: { id: 'fac-1', name: 'Demo Pharmacy (fake)' },
    amountStroops: '500000000',
    asset: 'XLM',
    reason: 'not_received',
    openedAt,
    updatedAt: openedAt,
  };
}

function dispute(overrides: Partial<FulfillmentDispute> = {}): FulfillmentDispute {
  return {
    ...summary('dsp-1', '2026-10-14T08:00:00.000Z'),
    patientReport: {
      reason: 'not_received',
      description: 'Nothing arrived.',
      submittedAt: '2026-10-14T08:00:00.000Z',
      submittedBy: 'Pat Placeholder',
    },
    facilityProof: null,
    payment: { intentId: 'pin-1', status: 'escrowed', escrowId: 'esc-1' },
    timeline: [],
    resolvedAt: null,
    resolution: null,
    resolutionNotes: null,
    resolvedBy: null,
    ...overrides,
  };
}

describe('dispute queue helpers', () => {
  it('sorts oldest first without mutating the loaded pages', () => {
    const newer = summary('newer', '2026-10-19T08:00:00.000Z');
    const older = summary('older', '2026-10-10T08:00:00.000Z');
    const input = [newer, older];

    expect(sortByAge(input).map((item) => item.id)).toEqual(['older', 'newer']);
    expect(input.map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('flags age sooner because money is stuck, not merely waiting', () => {
    expect(ageTone(3)).toBe('elevated');
    expect(ageTone(23)).toBe('elevated');
    expect(ageTone(24)).toBe('high');
    expect(ageTone(71)).toBe('high');
    expect(ageTone(72)).toBe('critical');
  });

  it('reports hours and the oldest label, tolerating bad timestamps', () => {
    const now = Date.parse('2026-10-20T12:00:00.000Z');
    expect(hoursSince('2026-10-18T12:00:00.000Z', now)).toBe(48);
    expect(hoursSince('not-a-date', now)).toBeNull();
    expect(oldestAgeLabel([], now)).toBeNull();
    expect(oldestAgeLabel([summary('a', '2026-10-19T12:00:00.000Z'), summary('b', '2026-10-18T12:00:00.000Z')], now)).toBe(
      '2 d',
    );
  });

  it('labels reasons and falls back for unknown values', () => {
    expect(reasonLabel('not_received')).toBe('Not received');
    expect(reasonLabel('damaged')).toBe('Damaged');
    expect(reasonLabel('mystery' as never)).toBe('mystery');
  });
});

describe('resolution consequences', () => {
  it('describes releasing held escrow to the facility', () => {
    const consequence = resolutionConsequence(dispute(), 'facility');
    expect(consequence.payment).toBe('Release 50 XLM from escrow to Demo Pharmacy (fake).');
    expect(consequence.outcome).toMatch(/Pat Placeholder is not refunded/);
    expect(consequence.amountLabel).toBe('50 XLM');
    expect(consequence.movesMoney).toBe(true);
  });

  it('describes refunding held escrow to the patient', () => {
    const consequence = resolutionConsequence(dispute({ amountStroops: '250000000' }), 'patient');
    expect(consequence.payment).toBe('Refund 25 XLM from escrow to Pat Placeholder.');
    expect(consequence.outcome).toMatch(/Demo Pharmacy \(fake\) is not paid/);
    expect(consequence.movesMoney).toBe(true);
  });

  it.each([
    ['released', /already released to the facility/],
    ['refunded', /already refunded to the patient/],
    ['created', /not held in escrow/],
    ['failed', /not held in escrow/],
  ] as const)('never promises to move money for a %s payment', (status, copy) => {
    const consequence = resolutionConsequence(dispute({ payment: { intentId: 'pin-1', status, escrowId: null } }), 'patient');
    expect(consequence.payment).toMatch(copy);
    expect(consequence.payment).toMatch(/No money moves/);
    expect(consequence.movesMoney).toBe(false);
    expect(consequence.amountLabel).toBeNull();
  });

  it('names actions and parties for the UI', () => {
    expect(resolutionTitle('facility')).toBe('Resolve for facility');
    expect(resolutionTitle('patient')).toBe('Resolve for patient');
    expect(resolutionLabel('facility')).toBe('facility');
    expect(resolutionLabel('patient')).toBe('patient');
  });
});

describe('resolution notes', () => {
  it('normalises whitespace before length checks and submission', () => {
    expect(normaliseNotes('  proof   matches\n the courier  ')).toBe('proof matches the courier');
  });

  it('requires enough detail to be useful in the audit trail', () => {
    expect(validateNotes('too short')).toMatch(/at least 10/);
    expect(validateNotes('           ')).toMatch(/at least 10/);
    expect(validateNotes('Proof matches courier record')).toBeNull();
  });

  it('rejects notes beyond the backend limit', () => {
    expect(validateNotes('a'.repeat(NOTES_MAX_LENGTH + 1))).toMatch(/under 500/);
  });
});

describe('display helpers', () => {
  it('formats dispute age in days and hours', () => {
    const now = Date.parse('2026-10-20T12:00:00.000Z');
    expect(ageLabel('2026-10-20T11:52:00.000Z', now)).toBe('8 m');
    expect(ageLabel('2026-10-20T09:00:00.000Z', now)).toBe('3 h');
    expect(ageLabel('2026-10-18T08:00:00.000Z', now)).toBe('2 d 4 h');
    expect(ageLabel('bad', now)).toBe('unknown age');
  });

  it('formats attachment sizes and kinds without inventing values', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(184_320)).toBe('180 KB');
    expect(formatBytes(2_411_724)).toBe('2.3 MB');
    expect(formatBytes(Number.NaN)).toBe('unknown size');
    expect(attachmentKindLabel('dispensing_record')).toBe('Dispensing record');
    expect(attachmentKindLabel('specimen_id')).toBe('Specimen ID');
    expect(attachmentKindLabel('mystery')).toBe('mystery');
  });

  it('shows signed-link expiry honestly', () => {
    const now = Date.parse('2026-10-20T12:00:00.000Z');
    expect(expiryLabel('2026-10-20T12:05:00.000Z', now)).toBe('expires in 5 min');
    expect(expiryLabel('2026-10-20T12:00:30.000Z', now)).toBe('expires in under a minute');
    expect(expiryLabel('2026-10-20T11:59:00.000Z', now)).toBe('expired');
  });
});
