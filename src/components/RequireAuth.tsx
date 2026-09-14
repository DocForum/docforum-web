import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import type { Role } from '../types/models';

interface RequireAuthProps {
  allowedRoles: Role[];
  children: ReactNode;
}

/** Route guard: redirects to /login if unauthenticated, or to / if the
 * signed-in user's role isn't allowed for this route. */
export function RequireAuth({ allowedRoles, children }: RequireAuthProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
