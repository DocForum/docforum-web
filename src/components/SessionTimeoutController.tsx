// Mounts the idle-timeout machinery for signed-in users (issue #82):
// fetches the backend's per-role timeout settings (frontend defaults when
// not served yet), tracks activity across tabs, shows the warning modal,
// and performs the full timeout sign-out sequence — API logout, all
// client state cleared, then /login with the reason.
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';
import { IDLE_TIMEOUT_DEFAULTS, sanitizeSessionTimeoutSettings } from '../hooks/idle-timeout';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { getSessionTimeoutSettings } from '../services/session-timeout-service';
import { logout } from '../services/auth-service';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';

export function SessionTimeoutController() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const signOutDueToIdle = useAuthStore((state) => state.signOutDueToIdle);
  const unsavedCount = useUnsavedChangesStore((state) => state.count);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['session-timeout', user?.role],
    queryFn: () => getSessionTimeoutSettings(accessToken!),
    enabled: Boolean(user && accessToken),
    retry: false,
    staleTime: 5 * 60_000,
  });

  // The backend's value wins when it is served and sane; otherwise the
  // role-based frontend defaults apply (endpoint missing = 404 today).
  const settings = useMemo(() => {
    if (!user) return null;
    return (
      sanitizeSessionTimeoutSettings(settingsQuery.data) ?? IDLE_TIMEOUT_DEFAULTS[user.role]
    );
  }, [settingsQuery.data, user]);

  const forceSignOut = useCallback(async () => {
    // 1. Best-effort server-side logout — a network failure must not trap
    // the user in a signed-out-looking limbo; the session clearing below
    // happens regardless.
    if (accessToken) {
      try {
        await logout(accessToken);
      } catch {
        // Intentional: client cleanup and redirect proceed anyway.
      }
    }
    // 2. Clear ALL client state: query cache, profile/acting-for store,
    // and the unsaved-changes registry.
    queryClient.clear();
    useProfileStore.setState({ profiles: [], selectedProfileId: null });
    useUnsavedChangesStore.getState().reset();
    // 3. Drop the session and land on login with the reason. The reason
    // also lives in the (in-memory) auth store, because a route guard's
    // redirect — e.g. RequireAuth on the page being left — can win the
    // navigation race and strip the query param; LoginPage shows the
    // notice when either source says idle-timeout.
    signOutDueToIdle();
    navigate('/login?reason=idle-timeout', { replace: true });
  }, [accessToken, signOutDueToIdle, navigate, queryClient]);

  const { phase, secondsRemaining, extendSession } = useIdleTimeout({
    enabled: Boolean(user && settings),
    // Unused while disabled; any valid stand-in keeps types honest.
    settings: settings ?? IDLE_TIMEOUT_DEFAULTS.patient,
    onTimeout: forceSignOut,
  });

  if (!user || !settings) return null;

  return (
    <SessionTimeoutWarning
      open={phase === 'warning'}
      secondsRemaining={secondsRemaining}
      unsavedChanges={unsavedCount > 0}
      onStaySignedIn={extendSession}
      onSignOutNow={forceSignOut}
    />
  );
}
