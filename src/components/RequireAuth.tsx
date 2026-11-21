import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
 * role isn't allowed for this route. The attempted path travels in router
 * state (never the URL) so LoginPage can return the user to it after signing
 * in, subject to a role allowlist (issue #226). */
export function RequireAuth({ allowedRoles, children }: RequireAuthProps) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
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

  if (!user) {
    // Remember the full path + query + hash so we can return here after login
    // The path travels in router state (never the URL), subject to role allowlist below
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
