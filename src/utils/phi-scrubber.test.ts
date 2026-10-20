import { describe, expect, it } from 'vitest';
import { phiScrubber, phiBeforeBreadcrumb } from './phi-scrubber';

const baseEvent = {
  message: 'Something broke',
  request: {
    method: 'POST',
    url:
      'https://app.example.dev/patient/intake/550e8400-e29b-41d4-a716-446655440000?token=abc123secret&audit=1',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
    cookies: { session: 'sess_123' },
    data: {
      fullName: 'Jane Doe',
      intake: 'Patient reports chest pain since Tuesday, allergic to penicillin.',
      email: 'jane.doe@example.com',
    },
  },
  response: {
    body: { patientName: 'Jane Doe', diagnosis: 'hypertension' },
    headers: { 'set-cookie': 'session=sess_123' },
  },
  user: {
    id: 'user-999',
    email: 'jane.doe@example.com',
    ip_address: '1.2.3.4',
    username: 'jane',
  },
  extra: {
    formValues: { fullName: 'Jane Doe', phone: '555-123-4567' },
    intake: 'Intake text: chest pain, penicillin allergy.',
    benign: 'ok',
  },
  contexts: {
    trace: { trace_id: 'abc' },
    userinfo: { email: 'jane.doe@example.com', fullName: 'Jane Doe' },
  },
  tags: { route: '/patient/intake', email: 'jane.doe@example.com' },
  breadcrumbs: [
    {
      type: 'http',
      category: 'fetch',
      data: {
        url: 'https://api.example.dev/patients/550e8400-e29b-41d4-a716-446655440000',
        body: { ssn: '123-45-6789' },
      },
    },
    { type: 'user', message: 'submitted intake form', data: { fullName: 'Jane Doe' } },
  ],
  exception: {
    values: [
      {
        type: 'Error',
        value: 'Failed to submit intake for Jane Doe (jane.doe@example.com)',
        stacktrace: { frames: [] },
      },
    ],
  },
} as unknown;

function freshEvent() {
  return JSON.parse(JSON.stringify(baseEvent));
}

describe('phiScrubber', () => {
  it('removes request bodies, headers, cookies and query strings, keeping method + sanitized url', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    expect(scrubbed.request).toEqual({
      method: 'POST',
      url: 'https://app.example.dev/patient/intake/[id-redacted]',
    });
    expect(scrubbed.request.data).toBeUndefined();
    expect(scrubbed.request.headers).toBeUndefined();
    expect(scrubbed.request.cookies).toBeUndefined();
    expect(scrubbed.request.url).not.toContain('token');
    expect(scrubbed.request.url).not.toContain('abc123secret');
    expect(scrubbed.request.url).not.toContain('550e8400-e29b-41d4-a716-446655440000');
  });

  it('drops the response entirely (no body or headers)', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    expect(scrubbed.response).toBeUndefined();
  });

  it('identifies the user by an opaque id only', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    expect(scrubbed.user).toEqual({ id: '[user-redacted]:user_999' });
    expect(scrubbed.user.email).toBeUndefined();
    expect(scrubbed.user.ip_address).toBeUndefined();
    expect(scrubbed.user.username).toBeUndefined();
  });

  it('redacts form values and intake text from extra', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    expect(scrubbed.extra.formValues).toBe('[redacted]');
    expect(scrubbed.extra.intake).toBe('[redacted]');
    expect(scrubbed.extra.benign).toBe('ok');
  });

  it('redacts email / phone / ssn patterns in arbitrary strings', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    expect(scrubbed.extra.intake).not.toMatch(/jane\.doe@example\.com/);
    expect(scrubbed.contexts.userinfo.email).toBe('[redacted]');
    expect(scrubbed.contexts.userinfo.fullName).toBe('[redacted]');
    expect(scrubbed.tags.email).toBe('[redacted]');
  });

  it('redacts breadcrumb data (urls with ids, request bodies, ssn)', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    const [httpBreadcrumb] = scrubbed.breadcrumbs;
    expect(httpBreadcrumb.data.url).not.toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(httpBreadcrumb.data.body).toBe('[redacted]');
    const [, userBreadcrumb] = scrubbed.breadcrumbs;
    expect(userBreadcrumb.data.fullName).toBe('[redacted]');
  });

  it('redacts PHI patterns (email) echoed in exception messages', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    expect(scrubbed.exception.values[0].value).not.toContain('jane.doe@example.com');
    expect(scrubbed.exception.values[0].value).toContain('[email-redacted]');
  });

  it('leaves benign data intact', () => {
    const scrubbed = phiScrubber(freshEvent() as any, {}) as any;
    expect(scrubbed.extra.benign).toBe('ok');
    expect(scrubbed.message).toBe('Something broke');
  });

  it('returns an event (does not drop it) when nothing is sensitive', () => {
    const clean = { message: 'hello', extra: { foo: 'bar' }, user: { id: 'u-1' } };
    const scrubbed = phiScrubber(clean as any, {});
    expect(scrubbed).not.toBeNull();
    expect((scrubbed as any).extra.foo).toBe('bar');
  });
});

describe('phiBeforeBreadcrumb', () => {
  it('scrubs sensitive keys in breadcrumb data', () => {
    const scrubbed = phiBeforeBreadcrumb(
      {
        type: 'user',
        message: 'clicked submit',
        data: { email: 'a@b.com', formValues: { ssn: '123-45-6789' }, safe: 'ok' },
      },
      {},
    ) as any;
    expect(scrubbed.data.email).toBe('[redacted]');
    // Entire form-values payload is withheld, not recursed into.
    expect(scrubbed.data.formValues).toBe('[redacted]');
    expect(scrubbed.data.safe).toBe('ok');
    expect(scrubbed.message).toBe('clicked submit');
  });

  it('returns a breadcrumb unchanged when nothing is sensitive', () => {
    expect(phiBeforeBreadcrumb({ type: 'navigation', message: 'nav' } as any, {})).not.toBeNull();
  });
});
