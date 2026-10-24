import type { ReactNode } from 'react';
import { useFlag, useFlagsStatus } from '../features/feature-flags/hooks/useFlags';

interface FlagProps {
  name: string;
  children: ReactNode;
  /** Rendered when the flag is off, failed to load, or the session is gone. */
  fallback?: ReactNode;
  /** Rendered while flags are loading. Defaults to nothing so a gated
   * section never flashes into the layout and then disappears. */
  loadingFallback?: ReactNode;
}

/** Renders children only when the current user's evaluated flag is on. */
export function Flag({ name, children, fallback = null, loadingFallback = null }: FlagProps) {
  const { isLoading } = useFlagsStatus();
  const enabled = useFlag(name);

  if (isLoading) return <>{loadingFallback}</>;
  return <>{enabled ? children : fallback}</>;
}
