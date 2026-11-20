import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from './Spinner';
import { useFlag, useFlagsStatus } from '../features/feature-flags/hooks/useFlags';

interface RequireFlagProps {
  name: string;
  children: ReactNode;
  /** Where to send a user whose flag is off. Defaults to the app home. */
  redirectTo?: string;
}

/**
 * Route guard for flag-gated screens (issue #111). Waits for the flags
 * request before deciding, so a gated route never renders and then yanks
 * the layout away. A failed request means off.
 */
export function RequireFlag({ name, children, redirectTo = '/' }: RequireFlagProps) {
  const { isLoading } = useFlagsStatus();
  const enabled = useFlag(name);

  if (isLoading) {
    return (
      <div className="container" role="status" aria-live="polite">
        <Spinner size={20} /> Checking feature availability…
      </div>
    );
  }

  if (!enabled) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
