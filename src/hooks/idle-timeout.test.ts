import { describe, expect, it } from 'vitest';
import {
  IDLE_TIMEOUT_DEFAULTS,
  idlePhaseFor,
  mergeActivityTimestamps,
  msUntilExpiry,
  sanitizeSessionTimeoutSettings,
} from './idle-timeout';

describe('IDLE_TIMEOUT_DEFAULTS', () => {
  it('is stricter for doctor, facility and admin than for patients', () => {
    for (const role of ['doctor', 'facility', 'admin'] as const) {
      expect(IDLE_TIMEOUT_DEFAULTS[role].idleTimeoutMinutes).toBeLessThan(
        IDLE_TIMEOUT_DEFAULTS.patient.idleTimeoutMinutes,
      );
      expect(IDLE_TIMEOUT_DEFAULTS[role].warningSeconds).toBeGreaterThan(0);
    }
  });
});

describe('idlePhaseFor', () => {
  const settings = { idleTimeoutMinutes: 10, warningSeconds: 60 };
  const start = 1_000_000;

  it('is active below the warning threshold', () => {
    expect(idlePhaseFor(start, start, settings)).toBe('active');
    // Warning starts AT (timeout − warning) = 9 minutes, inclusive.
    expect(idlePhaseFor(start, start + 9 * 60_000 - 1, settings)).toBe('active');
  });

  it('warns from (timeout − warning) until the timeout', () => {
    expect(idlePhaseFor(start, start + 9 * 60_000, settings)).toBe('warning');
    expect(idlePhaseFor(start, start + 10 * 60_000 - 1, settings)).toBe('warning');
  });

  it('expires at the timeout — and stays expired however late the check runs', () => {
    expect(idlePhaseFor(start, start + 10 * 60_000, settings)).toBe('expired');
    // A background tab whose timers were throttled for 20 minutes still
    // computes the right state from timestamps, not from tick counts.
    expect(idlePhaseFor(start, start + 30 * 60_000, settings)).toBe('expired');
  });

  it('treats clock skew backwards as no idling', () => {
    expect(idlePhaseFor(start, start - 5_000, settings)).toBe('active');
  });
});

describe('msUntilExpiry', () => {
  const settings = { idleTimeoutMinutes: 10, warningSeconds: 60 };
  const start = 1_000_000;

  it('counts down from the timeout and clamps at zero', () => {
    expect(msUntilExpiry(start, start, settings)).toBe(10 * 60_000);
    expect(msUntilExpiry(start, start + 60_000, settings)).toBe(9 * 60_000);
    expect(msUntilExpiry(start, start + 60 * 60_000, settings)).toBe(0);
  });
});

describe('sanitizeSessionTimeoutSettings', () => {
  it('accepts a sane backend value', () => {
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 5, warningSeconds: 30 })).toEqual({
      idleTimeoutMinutes: 5,
      warningSeconds: 30,
    });
  });

  it('defaults the warning when the backend omits it', () => {
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 30 })).toEqual({
      idleTimeoutMinutes: 30,
      warningSeconds: 60,
    });
  });

  it('rejects garbage and out-of-range values so the client defaults apply', () => {
    expect(sanitizeSessionTimeoutSettings(null)).toBeNull();
    expect(sanitizeSessionTimeoutSettings('soon')).toBeNull();
    expect(sanitizeSessionTimeoutSettings({})).toBeNull();
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 0 })).toBeNull();
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 2.5 })).toBeNull();
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 500 })).toBeNull();
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 10, warningSeconds: 5 })).toBeNull();
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 10, warningSeconds: 301 })).toBeNull();
    // A warning that doesn't fit inside the timeout is nonsense.
    expect(sanitizeSessionTimeoutSettings({ idleTimeoutMinutes: 10, warningSeconds: 595 })).toBeNull();
  });
});

describe('mergeActivityTimestamps', () => {
  it('keeps the newest timestamp — local or remote', () => {
    expect(mergeActivityTimestamps(100, 300, 200)).toBe(300);
    expect(mergeActivityTimestamps(0, 42)).toBe(42);
    expect(mergeActivityTimestamps()).toBe(0);
    // Non-finite noise (a bad message) can never win.
    expect(mergeActivityTimestamps(500, Number.NaN, Number.POSITIVE_INFINITY)).toBe(500);
  });
});
