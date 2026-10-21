import { describe, expect, it } from 'vitest';
import {
  facilityInsightsToCsv,
  formatHours,
  rejectionReasonLabel,
} from './facility-insights';
import type { FacilityPerformanceInsights } from '../../types/models';

const insights: FacilityPerformanceInsights = {
  facilityId: 'fac-main',
  range: { preset: '30d', startDate: '2026-09-18', endDate: '2026-10-18' },
  generatedAt: '2026-10-18T06:00:00.000Z',
  turnaround: {
    fulfilledCount: 68,
    medianHours: 3.5,
    p90Hours: 27.4,
    minHours: 0.4,
    maxHours: 51.2,
    within1h: 12,
    within4h: 38,
    within24h: 61,
    over24h: 7,
    sampleSizeWarning: false,
  },
  volumeByDay: [{ date: '2026-10-12', received: 9, fulfilled: 8, rejected: 1 }],
  rejectionReasons: [
    { code: 'out_of_stock', label: 'Out of stock', count: 4, percentage: 57.1 },
    { code: 'needs, quote "x"', label: '', count: 1, percentage: 14.3 },
  ],
  disputes: {
    totalOrders: 68,
    disputedOrders: 3,
    disputeRate: 4.4,
    resolvedInFacilityFavour: 1,
    resolvedInPatientFavour: 1,
    openDisputes: 1,
    averageResolutionHours: 40.5,
    sampleSizeWarning: false,
  },
};

describe('facility insights formatting', () => {
  it('formats hours as minutes, hours or days', () => {
    expect(formatHours(0.5)).toBe('30m');
    expect(formatHours(3.5)).toBe('3.5h');
    expect(formatHours(27.4)).toBe('1.1d');
    expect(formatHours(51.2)).toBe('2.1d');
    expect(formatHours(-1)).toBe('—');
    expect(formatHours(Number.NaN)).toBe('—');
  });

  it('prefers a server label and title-cases the code otherwise', () => {
    expect(rejectionReasonLabel('out_of_stock', 'Out of stock')).toBe('Out of stock');
    expect(rejectionReasonLabel('no_answer')).toBe('No Answer');
  });
});

describe('facility insights CSV export', () => {
  it('includes range, facility metrics, volume and rejection sections', () => {
    const csv = facilityInsightsToCsv(insights);
    expect(csv).toContain('section,metric,value');
    expect(csv).toContain('range,start_date,2026-09-18');
    expect(csv).toContain('facility,turnaround_median_hours,3.5');
    expect(csv).toContain('volume_date,received,fulfilled,rejected');
    expect(csv).toContain('2026-10-12,9,8,1');
    expect(csv).toContain('rejection_code,rejection_label,count,percentage');
    expect(csv).toContain('out_of_stock,Out of stock,4,57.1');
  });

  it('escapes cells that contain commas or quotes (CSV injection-safe)', () => {
    const csv = facilityInsightsToCsv(insights);
    expect(csv).toContain('"needs, quote ""x""","Needs, quote ""x""",1,14.3');
  });

  it('never includes patient-level fields', () => {
    const csv = facilityInsightsToCsv(insights).toLowerCase();
    expect(csv).not.toContain('patientname');
    expect(csv).not.toContain('patientprofile');
  });
});
