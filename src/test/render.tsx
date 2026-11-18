// Shared test renderer (issue #105).
//
// `renderWithProviders` wraps a component in what the app actually needs:
// a fresh React Query client per render (no cache leaks between tests), a
// router starting at a chosen route, an intl provider (components read copy
// through `useT`, which needs one), and an optional signed-in session for a
// role. `render` stays as the plain, session-agnostic entry point the existing
// tests use, so adopting the utilities is incremental.
//
// The MSW server (`src/test/server.ts`) is started once per run in
// `src/test/setup.ts`, and is re-exported here for tests that drive the real
// service layer:
//
//   server.use(http.get('/notifications', () => HttpResponse.json(page)));
import type { ReactElement } from 'react';
import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { TimeZoneProvider } from '../i18n/TimeZoneProvider';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';
import type { Role, User } from '../types/models';
import { makeUser } from './factories';

/**
 * A fresh, isolated QueryClient. Retries are off so a failing query fails the
 * test instead of delaying it, matching `src/query-client.ts`'s
 * "never retry a cancellation" behaviour without the extra attempts.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Sign the auth store in as `role` (or as a specific user/token). */
export function signInAs(role: Role, overrides: Partial<User> = {}) {
  const user = makeUser({ ...overrides, role });
  const accessToken = `test-${role}-token`;
  useAuthStore.getState().setSession(user, accessToken);
  return { user, accessToken };
}

/** Clear every Zustand store a test may have written. */
export function resetTestStores(): void {
  useAuthStore.setState({ user: null, accessToken: null, signOutReason: null });
  useProfileStore.setState({ profiles: [], selectedProfileId: null });
  useUnsavedChangesStore.setState({ count: 0 });
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for the MemoryRouter. Default `/`. */
  route?: string;
  /** Initial history stack (overrides `route` when given). */
  routes?: string[];
  /** Initial history stack, matching the plain `render` signature. */
  initialEntries?: string[];
  /** Sign in as this role before rendering. Omit for a signed-out render. */
  role?: Role;
  /** Explicit session, for tests that need a specific user id/email/token. */
  session?: { user: User; accessToken: string };
  /** Pass an existing client to assert on its cache. */
  queryClient?: QueryClient;
}

export interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const {
    route = '/',
    routes,
    initialEntries,
    role,
    session,
    queryClient = createTestQueryClient(),
    ...rtlOptions
  } = options;

  // Only touch the session when the test asked for one — a test that set up
  // the store itself before rendering must keep that session. Isolation comes
  // from the global `resetTestStores()` in `src/test/setup.ts`.
  if (session) {
    useAuthStore.getState().setSession(session.user, session.accessToken);
  } else if (role) {
    signInAs(role);
  }

  const result = rtlRender(ui, {
    wrapper: ({ children }) => (
      // Empty message catalogue: components carry English `defaultMessage`s,
      // exactly like the app does before a locale chunk resolves.
      <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
        <QueryClientProvider client={queryClient}>
          <TimeZoneProvider>
            <MemoryRouter initialEntries={initialEntries ?? routes ?? [route]}>{children}</MemoryRouter>
          </TimeZoneProvider>
        </QueryClientProvider>
      </IntlProvider>
    ),
    ...rtlOptions,
  });

  return { ...result, queryClient };
}

/** Signed-out render with a router and a fresh QueryClient. */
export function render(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  return renderWithProviders(ui, options);
}

export * from '@testing-library/react';
export { server } from './server';
