// Role-switching helpers for mock mode: applies a seeded persona to the
// app's real auth/profile stores and routes to that role's home screen.
import { homePathForRole } from '../navigation/role-home';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { signOut } from '../services/sign-out';
import { DEPENDENT_PROFILE_ID, MOCK_ACCESS_TOKEN, MOCK_CSRF_TOKEN, PATIENT_PROFILE_ID } from './fixtures';
import { personaForRole } from './handlers/auth';
import { useMockStore } from './mock-store';
import type { Role } from '../types/models';

/**
 * Sign in as the seeded persona for `role` (or switch to it). Sets the
 * app's real auth session — mock handlers only care about the route, not
 * the token — and routes to the role's dashboard.
 */
export function activateMockRole(
  role: Role,
  options: { navigate?: boolean } = {},
): void {
  const { navigate = true } = options;
  useMockStore.getState().setActiveRole(role);
  const persona = personaForRole(role);
  useAuthStore.getState().setSession(persona, MOCK_ACCESS_TOKEN, MOCK_CSRF_TOKEN);
  useProfileStore.getState().setProfiles(
    role === 'patient'
      ? [
          { id: PATIENT_PROFILE_ID, fullName: 'Pat Placeholder (fake)', isSelf: true },
          { id: DEPENDENT_PROFILE_ID, fullName: 'Tyke Placeholder (fake)', isSelf: false },
        ]
      : [],
  );
  if (navigate) window.location.hash = `#${homePathForRole(role)}`;
}

/** Clear the session and land on the login screen (to test the real flow). */
export function mockSignOut(): void {
  // Route through the shared helper so mock sign-out clears the query cache
  // and acting-for profiles like every other path (issue #227).
  void signOut('mock');
  window.location.hash = '#/login';
}

const ROLES: readonly Role[] = ['patient', 'doctor', 'facility', 'admin'];

function isRole(value: string | null): value is Role {
  return value !== null && (ROLES as readonly string[]).includes(value);
}

/**
 * Read and remove `?previewRole=` for mock and PR-preview builds. The
 * parameter is a developer convenience (screenshots, reviewing a preview
 * build), so it only exists inside `src/mocks/`; production builds never
 * import this module. Once read, it is stripped from the address bar so a
 * bookmarked or shared URL does not carry it.
 */
export function consumePreviewRole(): Role | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('previewRole');
  if (!isRole(value)) return null;

  params.delete('previewRole');
  const query = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  );
  return value;
}
