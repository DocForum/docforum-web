import { Route } from 'react-router-dom';
import { AccountDeletedPage } from '../pages/AccountDeletedPage';
import { ClaimAccountPage } from '../pages/ClaimAccountPage';
import { HomePage } from '../pages/HomePage';
import { InvitePage } from '../pages/InvitePage';
import { LoginPage } from '../pages/LoginPage';
import { NotificationSettingsPage } from '../pages/NotificationSettingsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { PUBLIC_CONTENT_ROUTES } from '../pages/public-page-map';
import { PrivacyPage } from '../pages/PrivacyPage';
import { RequireAuth } from '../components/RequireAuth';
import { RequireFlag } from '../components/RequireFlag';
import { SignupPage } from '../pages/SignupPage';
import { paths } from './paths';

/** Public pages, sign-in and account routes, and pages every role shares. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const publicRoutes = (
  <>
    <Route index element={<HomePage />} />
    {/* Public information pages (issue #120) — no auth guard, and each
        one is prerendered to static HTML at build time; see
        `src/pages/public-routes.ts` and `scripts/prerender.mjs`. */}
    {PUBLIC_CONTENT_ROUTES.map(({ path, Component }) => (
      <Route key={path} path={path} element={<Component />} />
    ))}
    <Route path={paths.login} element={<LoginPage />} />
    <Route path={paths.signup} element={<SignupPage />} />
    <Route path={paths.claimAccount} element={<ClaimAccountPage />} />
    <Route path={paths.invite} element={<InvitePage />} />
    <Route path={paths.accountDeleted} element={<AccountDeletedPage />} />
    <Route
      path={paths.notificationSettings}
      element={
        <RequireAuth allowedRoles={['patient', 'doctor', 'facility', 'admin']}>
          <RequireFlag name="notification_preferences">
            <NotificationSettingsPage />
          </RequireFlag>
        </RequireAuth>
      }
    />
    {/* Notification centre (issue #107) — every signed-in role has an inbox. */}
    <Route
      path={paths.notifications}
      element={
        <RequireAuth allowedRoles={['patient', 'doctor', 'facility', 'admin']}>
          <NotificationsPage />
        </RequireAuth>
      }
    />
    <Route path={paths.privacyAnalytics} element={<PrivacyPage />} />
  </>
);
