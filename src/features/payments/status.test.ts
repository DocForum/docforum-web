import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api-client';
import {
  historyErrorCopy,
  orderTypeLabel,
  refundDeadlineCopy,
  statusCopy,
  statusLabel,
  STATUS_COPY,
} from './status';
import type { PaymentIntentStatus } from '../../types/models';

const NOW = new Date('2026-10-16T12:00:00Z');

describe('payment status copy', () => {
  // The review criterion for #37 is that each real status is explained, not
  // printed as the contract's token.
  it('explains every status the contract has', () => {
    const statuses: PaymentIntentStatus[] = ['created', 'escrowed', 'released', 'refunded', 'failed'];
    expect(statuses).toEqual(Object.keys(STATUS_COPY));
    for (const status of statuses) {
      expect(statusCopy(status)).not.toBe(status);
      expect(statusCopy(status).length).toBeGreaterThan(20);
      expect(statusLabel(status)).not.toBe(status);
    }
  });

  it('says where the money actually is for each state', () => {
    expect(statusCopy('created')).toMatch(/nothing has left you/i);
    expect(statusCopy('escrowed')).toMatch(/holding this money in escrow/i);
    expect(statusCopy('released')).toMatch(/released to the facility/i);
    expect(statusCopy('refunded')).toMatch(/came back out of escrow/i);
    expect(statusCopy('failed')).toMatch(/nothing was moved/i);
  });

  it('does not crash on a status added server-side first', () => {
    expect(statusCopy('pending_signature' as PaymentIntentStatus)).toMatch(/cannot explain/i);
    expect(statusLabel('pending_signature' as PaymentIntentStatus)).toBe('Unknown status');
  });

  it('names the two order types in words', () => {
    expect(orderTypeLabel('prescription')).toBe('Prescription');
    expect(orderTypeLabel('lab_order')).toBe('Lab order');
  });
});

describe('refundDeadlineCopy', () => {
  it('says nothing when the backend set no deadline', () => {
    expect(refundDeadlineCopy(null, NOW)).toBeNull();
    expect(refundDeadlineCopy(undefined, NOW)).toBeNull();
  });

  it('opens the window in the present tense before it closes', () => {
    expect(refundDeadlineCopy('2026-10-20T12:00:00Z', NOW)).toMatch(/can still be refunded until/i);
  });

  it('switches to closed once it has passed', () => {
    expect(refundDeadlineCopy('2026-10-10T12:00:00Z', NOW)).toMatch(/refund window closed on/i);
  });

  it('ignores an unparseable deadline instead of printing NaN', () => {
    expect(refundDeadlineCopy('soon', NOW)).toBeNull();
  });
});

describe('historyErrorCopy', () => {
  // core#90 has not landed, so a 404 is the ordinary case today and must read
  // as "not available yet", never as "you have paid nothing".
  it('describes a missing endpoint as unavailable, not empty', () => {
    expect(historyErrorCopy(new ApiError('Not Found', 404))).toMatch(/not available for this deployment yet/i);
  });

  it('passes a real API message through', () => {
    expect(historyErrorCopy(new ApiError('Payment history is temporarily unavailable.', 503))).toBe(
      'Payment history is temporarily unavailable.',
    );
  });

  it('has a fallback for a network failure', () => {
    expect(historyErrorCopy(new Error('offline'))).toMatch(/could not be loaded/i);
  });
});
