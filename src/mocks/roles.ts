// Role-switching helpers for mock mode: applies a seeded persona to the
// app's real auth/profile stores and routes to that role's home screen.
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { signOut } from '../services/sign-out';
import { DEPENDENT_PROFILE_ID, MOCK_ACCESS_TOKEN, MOCK_CSRF_TOKEN, PATIENT_PROFILE_ID } from './fixtures';
import { personaForRole } from './handlers/auth';
import { useMockStore } from './mock-store';
import { mockNavigate } from './navigation';
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
  if (navigate) mockNavigate(ROLE_HOME[role]);
}

/** Clear the session and land on the login screen (to test the real flow). */
export function mockSignOut(): void {
  // Route through the shared helper so mock sign-out clears the query cache
  // and acting-for profiles like every other path (issue #227).
  void signOut('mock');
  window.location.hash = '#/login';
}
