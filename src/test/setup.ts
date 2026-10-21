import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { resetDb } from '../mocks/db';
import { useMockStore } from '../mocks/mock-store';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
	resetDb();
	useMockStore.setState({ scenario: 'normal', latencyMs: 0, activeRole: 'patient' });
});
