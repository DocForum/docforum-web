// Demo mode must never produce a real API request (issue #127's review
// criterion). These tests compose the exact handler list the demo worker
// uses and prove seeded endpoints still answer while an unmocked API path is
// refused with a 503 rather than falling through to the network.
// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { resetDb } from '../mocks/db';
import { demoApiOrigins, realApiBlockers } from './block-real-api';
import * as authService from '../services/auth-service';
import * as paymentsService from '../services/payments-service';
import { MOCK_ACCESS_TOKEN } from '../mocks/fixtures';

const server = setupServer(...handlers, ...realApiBlockers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => resetDb());

describe('demo mode API blocking', () => {
  it('still answers every seeded endpoint through the real service layer', async () => {
    const session = await authService.login({
      email: 'demo.doctor@example.test',
      password: 'anything',
    });
    expect(session.user.role).toBe('doctor');

    const page = await paymentsService.getFacilityPayoutLedger(
      'fac-demo-pharmacy',
      MOCK_ACCESS_TOKEN,
    );
    expect(page.entries.length).toBeGreaterThan(0);
  });

  it('refuses an API path no mock handler covers', async () => {
    const origin = demoApiOrigins()[0]!;
    const response = await fetch(`${origin}/some/real/endpoint`);
    expect(response.status).toBe(503);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain('real DocForum API is blocked');
  });
});
