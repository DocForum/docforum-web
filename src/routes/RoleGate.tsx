import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import type { Role } from '../types/models';

/**
 * The element of a role-guarded section (issue #112). The section's loader
 * (`requireRoles`) makes the decision on navigation; this keeps it true
 * while the page is open — a sign-out in another tab (issue #124), an idle
 * timeout (issue #82) or an acting-role change redirects immediately, the
 * way `<RequireAuth>` re-rendered and redirected. Same targets as the
 * loader: `/login` when signed out, `/` when the role isn't allowed.
 */
export function RoleGate({ allowedRoles }: { allowedRoles: readonly Role[] }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  if (status !== 'resolving') {
    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
