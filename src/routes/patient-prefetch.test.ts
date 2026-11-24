import { describe, expect, it } from 'vitest';
import { needsMyAppointments } from './patient-prefetch';

describe('needsMyAppointments', () => {
  it('prefetches for the hub home and appointment pages', () => {
    expect(needsMyAppointments(undefined)).toBe(true);
    expect(needsMyAppointments('')).toBe(true);
    expect(needsMyAppointments('/')).toBe(true);
    expect(needsMyAppointments('appointments/apt-1')).toBe(true);
    expect(needsMyAppointments('appointments/apt-1/intake')).toBe(true);
  });

  it('does not make other patient pages wait on appointments', () => {
    for (const splat of ['facilities', 'orders', 'orders/ord-1', 'settings', 'search', 'care/thread-1']) {
      expect(needsMyAppointments(splat)).toBe(false);
    }
  });
});
