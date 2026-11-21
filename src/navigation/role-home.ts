import type { Role } from '../types/models';

/**
 * The single source of truth for where each role belongs after signing in
 * and when visiting `/`. Unknown or missing roles fall back to the public
 * landing page instead of a role dashboard.
 */
const HOME_BY_ROLE: Record<Role, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
  admin: '/admin',
};

export function homePathForRole(role: string | null | undefined): string {
  if (role && role in HOME_BY_ROLE) return HOME_BY_ROLE[role as Role];
  return '/';
}
