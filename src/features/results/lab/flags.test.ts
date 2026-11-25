import { describe, expect, it } from 'vitest';
import { acknowledgementCopy, canViewFile, FLAG_EXPLANATION, STATUS_LABEL } from './flags';

describe('lab result flag states (#24)', () => {
  it('has distinct copy for every flag state', () => {
    expect(FLAG_EXPLANATION.normal).toMatch(/inside the reference range/i);
    expect(FLAG_EXPLANATION.abnormal).toMatch(/outside the usual range/i);
    expect(FLAG_EXPLANATION.critical).toMatch(/prompt attention/i);
    expect(new Set(Object.values(FLAG_EXPLANATION)).size).toBe(3);
  });

  it('labels every status', () => {
    expect(STATUS_LABEL.pending).toMatch(/waiting/i);
    expect(STATUS_LABEL.held).toMatch(/reviewed by your doctor/i);
    expect(STATUS_LABEL.available).toMatch(/ready/i);
    expect(STATUS_LABEL.reviewed).toMatch(/reviewed/i);
  });

  it('never lets a pending or held result be read', () => {
    expect(canViewFile('pending')).toBe(false);
    expect(canViewFile('held')).toBe(false);
    expect(canViewFile('available')).toBe(true);
    expect(canViewFile('reviewed')).toBe(true);
  });

  it('says a critical result notified the doctor only when the backend says it is pending/acknowledged', () => {
    expect(acknowledgementCopy({ status: 'pending' }, 'critical')?.heading).toMatch(
      /doctor has been notified/i,
    );
    expect(acknowledgementCopy({ status: 'pending' }, 'critical')?.tone).toBe('critical');
  });

  it('uses the doctor acknowledgement instead of claiming notification when reviewed', () => {
    const copy = acknowledgementCopy(
      { status: 'acknowledged', acknowledgedBy: 'Dr. Demo', nextStep: 'A follow-up call is booked.' },
      'abnormal',
    );
    expect(copy?.heading).toMatch(/Dr\. Demo has reviewed/i);
    expect(copy?.body).toBe('A follow-up call is booked.');
    expect(copy?.tone).toBe('info');
  });

  it('shows nothing next for a normal result', () => {
    expect(acknowledgementCopy({ status: 'not_required' }, 'normal')).toBeNull();
  });
});
