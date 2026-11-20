import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrubUrl, trackPageview, trackEvent, _resetAnalytics } from './analytics';

describe('scrubUrl', () => {
  it('strips the query string', () => {
    expect(scrubUrl('https://example.test/admin?intent=abc&token=xyz')).toBe('/admin');
  });

  it('replaces UUIDs in paths with :id', () => {
    expect(scrubUrl('https://example.test/patient/550e8400-e29b-41d4-a716-446655440000/appointments'))
      .toBe('/patient/:id/appointments');
  });

  it('replaces numeric path segments with :id', () => {
    expect(scrubUrl('https://example.test/orders/42/detail')).toBe('/orders/:id/detail');
  });

  it('returns / for an empty path', () => {
    expect(scrubUrl('https://example.test/')).toBe('/');
  });

  it('handles hash-style routes (#/path)', () => {
    const result = scrubUrl('https://example.test/#/patient/settings');
    expect(result).toBe('/patient/settings');
  });

  it('strips query from hash routes', () => {
    const result = scrubUrl('https://example.test/#/reset?token=secret');
    expect(result).toBe('/reset');
  });

  it('returns / for an unparseable URL', () => {
    expect(scrubUrl('not-a-url')).toBe('/');
  });
});

describe('analytics — enable/disable', () => {
  let sendBeacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    _resetAnalytics();
    sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not send when VITE_ANALYTICS_ENDPOINT is not set', () => {
    // No env var set — analytics is disabled by default.
    trackPageview('https://example.test/admin');
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('sends a pageview with a scrubbed URL when enabled', () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '/api/event');
    _resetAnalytics();
    trackPageview('https://example.test/patient/550e8400-e29b-41d4-a716-446655440000');
    expect(sendBeacon).toHaveBeenCalled();
    expect(sendBeacon.mock.calls[0][0]).toContain('/api/event');
  });

  it('does not send duplicate pageviews for the same scrubbed path', () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '/api/event');
    _resetAnalytics();
    trackPageview('https://example.test/admin');
    trackPageview('https://example.test/admin?intent=abc');
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('sends a second pageview for a different path', () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '/api/event');
    _resetAnalytics();
    trackPageview('https://example.test/admin');
    trackPageview('https://example.test/doctor');
    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });
});

describe('analytics — trackEvent allowlist', () => {
  let sendBeacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    _resetAnalytics();
    sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '/api/event');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends events on the allowlist', () => {
    trackEvent('booking_completed', { isNewPatient: false });
    expect(sendBeacon).toHaveBeenCalled();
  });

  it('sends signup_completed with a role', () => {
    trackEvent('signup_completed', { role: 'patient' });
    expect(sendBeacon).toHaveBeenCalledOnce();
  });
});

describe('analytics — DNT / GPC', () => {
  let sendBeacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    _resetAnalytics();
    sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', '/api/event');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // Restore DNT
    Object.defineProperty(navigator, 'doNotTrack', {
      value: null,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('does not send when DNT is "1"', () => {
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      configurable: true,
      writable: true,
    });
    _resetAnalytics();
    trackPageview('https://example.test/admin');
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('does not send when GPC is true', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      value: true,
      configurable: true,
      writable: true,
    });
    _resetAnalytics();
    trackPageview('https://example.test/admin');
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
