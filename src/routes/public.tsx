import { redirect, type RouteObject } from 'react-router-dom';
import { flagEnabled } from '../features/feature-flags/flags';
import { myFlagsQueryOptions } from '../features/feature-flags/hooks/useFlags';
import { notificationsQueryOptions } from '../features/notifications/hooks/useNotifications';
import { publicPageLoader, PUBLIC_CONTENT_ROUTES } from '../pages/public-page-map';
import { NOTIFICATIONS_PAGE_SIZE } from '../services/notifications-service';
import { useAuthStore } from '../store/auth-store';
import { ANY_ROLE } from './guards';
import { lazyPage } from './lazy';
import { guardedSection, settlePrefetch, type RouteContext } from './route-helpers';

/** Public pages, sign-in and account routes, and pages every role shares.
 * Mounted under the layout in `routes/index.tsx`. React Router ranks routes by
 * how specific their path is, so order between files doesn't matter. */
export function publicRoutes({ queryClient }: RouteContext): RouteObject[] {
  return [
    { index: true, lazy: async () => ({ Component: await publicPageLoader('/')() }) },
    // Public information pages (issue #120) — no auth guard, and each
    // one is prerendered to static HTML at build time; see
    // `src/pages/public-routes.ts` and `scripts/prerender.mjs`.
    ...PUBLIC_CONTENT_ROUTES.map(({ path, load }) => ({
      path,
      lazy: async () => ({ Component: await load() }),
    })),
    { path: 'login', lazy: lazyPage(() => import('../pages/LoginPage'), 'LoginPage') },
    { path: 'signup', lazy: lazyPage(() => import('../pages/SignupPage'), 'SignupPage') },
    { path: 'claim-account', lazy: lazyPage(() => import('../pages/ClaimAccountPage'), 'ClaimAccountPage') },
    { path: 'invite', lazy: lazyPage(() => import('../pages/InvitePage'), 'InvitePage') },
    { path: 'account-deleted', lazy: lazyPage(() => import('../pages/AccountDeletedPage'), 'AccountDeletedPage') },
    { path: 'privacy/analytics', lazy: lazyPage(() => import('../pages/PrivacyPage'), 'PrivacyPage') },
    guardedSection('signed-in', ANY_ROLE, [
      {
        path: 'settings/notifications',
        lazy: lazyPage(() => import('./NotificationSettingsRoute'), 'NotificationSettingsRoute'),
        // Flag gate (issue #111) decided in the loader, after the role
        // guard: a failed flags request means "off", exactly like
        // `<RequireFlag>`. The route component still wraps the page in
        // `<RequireFlag>` so a flag switched off mid-session takes effect.
        prefetch: async (_args, token) => {
          const userId = useAuthStore.getState().user?.id;
          const flags = await queryClient
            .ensureQueryData(myFlagsQueryOptions(userId, token))
            .catch(() => undefined);
          if (!flagEnabled(flags?.flags, 'notification_preferences')) throw redirect('/');
        },
      },
      // Notification centre (issue #107) — every signed-in role has an inbox.
      {
        path: 'notifications',
        lazy: lazyPage(() => import('../pages/NotificationsPage'), 'NotificationsPage'),
        prefetch: (_args, token) =>
          settlePrefetch([
            queryClient.ensureInfiniteQueryData(notificationsQueryOptions(NOTIFICATIONS_PAGE_SIZE, token)),
          ]),
      },
      {
        path: 'account/security',
        lazy: lazyPage(() => import('../pages/AccountSecurityPage'), 'AccountSecurityPage'),
      },
    ]),
  ];
}
