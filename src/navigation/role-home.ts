import type { Role } from '../types/models';

/**
 * The single source of truth for where each role belongs after signing in
 * and when visiting `/`. Unknown or missing roles fall back to the public
 * landing page instead of a role dashboard.
 */
export const ROLE_HOME: Record<Role, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
  admin: '/admin',
};

export function homePathForRole(role: string | null | undefined): string {
  if (role && Object.hasOwn(ROLE_HOME, role)) {
    return ROLE_HOME[role as Role];
  }
  return '/';
}
