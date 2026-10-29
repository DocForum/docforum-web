import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { server } from './server';
import { resetTestStores } from './render';

// Accessibility assertions (`expect(await axe(container)).toHaveNoViolations()`).
expect.extend(toHaveNoViolations);

// One MSW server for the run (issue #105): start it once, reset handler
// overrides after each test, close it at the end.
beforeAll(() => {
  // `bypass` keeps the ~90 tests that `vi.mock` the service layer working
  // unchanged; tests that drive the real services hit these handlers.
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  // `src/mocks/handlers.test.ts` runs in the node environment and mounts no
  // React tree — RTL's cleanup needs a document.
  if (typeof document !== 'undefined') cleanup();
  server.resetHandlers();
  // Stores are module singletons — a session or selected profile from one
  // test must never be visible to the next.
  resetTestStores();
});

afterAll(() => {
  server.close();
});
