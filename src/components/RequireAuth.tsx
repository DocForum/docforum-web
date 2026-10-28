import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from './Spinner';
import { useSlowRequestHint } from '../hooks/useSlowRequestHint';
import { useAuthStore } from '../store/auth-store';
import type { Role } from '../types/models';

interface RequireAuthProps {
  allowedRoles: Role[];
  children: ReactNode;
}

/** Route guard: waits for the boot refresh while it is resolving, then
 * redirects to /login if unauthenticated, or to / if the signed-in user's
 * role isn't allowed for this route. */
export function RequireAuth({ allowedRoles, children }: RequireAuthProps) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const isResolving = status === 'resolving';
  const isSlow = useSlowRequestHint(isResolving);

  // Don't bounce a signed-in user to /login just because the boot refresh
  // hasn't answered yet — that would make every reload look like a logout.
  if (isResolving) {
    return (
      <div role="status" aria-live="polite" className="card">
        <p>
          <Spinner size={14} /> Restoring your session…
        </p>
        {isSlow && (
          <p className="slowHint">
            Still working — the server may be waking up after being idle. This can take up to a
            minute.
          </p>
        )}
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
