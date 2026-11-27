// One MSW server for the whole test run (issue #105).
//
// Tests that mock the service layer with `vi.mock` never reach it; tests that
// exercise the real `src/services/` functions through MSW share this server and
// the production handlers, so a test asserts on the same contracts the app
// uses in `npm run dev:mock`.
//
// Lifecycle lives in `src/test/setup.ts` — one listener/reset/close for the
// run, never per test, so a forgotten `close()` cannot leak a socket.
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';

export const server = setupServer(...handlers);
