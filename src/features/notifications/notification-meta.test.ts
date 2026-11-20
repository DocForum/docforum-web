import { describe, expect, it } from 'vitest';
import {
  notificationDestination,
  notificationMeta,
  safeAppPath,
} from './notification-meta';

describe('notificationMeta', () => {
  it('maps every known kind to a category and label', () => {
    expect(notificationMeta('appointment_booked')).toEqual({
      category: 'appointment',
      label: 'Appointment',
    });
    expect(notificationMeta('result_ready').category).toBe('result');
    expect(notificationMeta('dispute_resolved').category).toBe('dispute');
  });

  it('renders unknown kinds generically instead of throwing', () => {
    expect(notificationMeta('some_future_kind')).toEqual({ category: 'other', label: 'Update' });
  });
});

describe('safeAppPath', () => {
  it('accepts only app-relative paths', () => {
    expect(safeAppPath('/patient/orders/ord-1')).toBe('/patient/orders/ord-1');
    expect(safeAppPath('  /care  ')).toBe('/care');
    expect(safeAppPath('')).toBeNull();
    expect(safeAppPath(null)).toBeNull();
  });

  it('rejects absolute, protocol-relative and scheme tricks (no open redirect)', () => {
    expect(safeAppPath('https://evil.example/phish')).toBeNull();
    expect(safeAppPath('//evil.example/phish')).toBeNull();
    expect(safeAppPath('/\\evil.example')).toBeNull();
    expect(safeAppPath('/redirect?to=https://evil.example')).toBeNull();
    expect(safeAppPath('javascript:alert(1)')).toBeNull();
  });
});

describe('notificationDestination', () => {
  it('prefers the payload deep link for a known kind', () => {
    expect(
      notificationDestination({ kind: 'order_fulfilled', link: '/patient/orders/ord-9' }, 'patient'),
    ).toBe('/patient/orders/ord-9');
  });

  it('falls back to a role-aware destination when the payload has none', () => {
    // A patient's message notification opens their care thread; a doctor's
    // opens the doctor inbox.
    expect(notificationDestination({ kind: 'message_received', link: null }, 'patient')).toBe('/care');
    expect(notificationDestination({ kind: 'message_received', link: null }, 'doctor')).toBe(
      '/doctor/messages',
    );
    expect(notificationDestination({ kind: 'dispute_opened', link: null }, 'admin')).toBe(
      '/admin/disputes',
    );
    expect(notificationDestination({ kind: 'payment_refunded', link: null }, 'facility')).toBe(
      '/facility/payments',
    );
  });

  it('uses a safe payload link for an unknown kind, otherwise renders no link', () => {
    expect(notificationDestination({ kind: 'future_kind', link: '/care' }, 'patient')).toBe('/care');
    expect(notificationDestination({ kind: 'future_kind', link: null }, 'patient')).toBeNull();
    expect(
      notificationDestination({ kind: 'future_kind', link: 'https://evil.example' }, 'patient'),
    ).toBeNull();
  });

  it('does not guess a destination when there is no role and no payload link', () => {
    expect(notificationDestination({ kind: 'appointment_booked', link: null }, null)).toBeNull();
  });
});
