import { Route } from 'react-router-dom';
import { AdminAuditPage } from '../pages/AdminAuditPage';
import { AdminCatalogsPage } from '../pages/AdminCatalogsPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminPaymentsConsolePage } from '../pages/AdminPaymentsConsolePage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminDisputeDetailPage } from '../pages/AdminDisputeDetailPage';
import { AdminDisputesPage } from '../pages/AdminDisputesPage';
import { AdminFlagsPage } from '../pages/AdminFlagsPage';
import { AdminReferralsPage } from '../pages/AdminReferralsPage';
import { AdminSystemPage } from '../pages/AdminSystemPage';
import { AdminVerificationDetailPage } from '../pages/AdminVerificationDetailPage';
import { AdminVerificationPage } from '../pages/AdminVerificationPage';
import { AdminVerificationsPage } from '../pages/AdminVerificationsPage';
import { RequireAuth } from '../components/RequireAuth';

/** Admin console routes. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const adminRoutes = (
  <>
    <Route
      path="admin/audit"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminAuditPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/referrals"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminReferralsPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/verifications"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminVerificationsPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/verification"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminVerificationPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/verifications/:doctorProfileId"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminVerificationDetailPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/disputes"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminDisputesPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/disputes/:disputeId"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminDisputeDetailPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/system"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminSystemPage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/flags"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminFlagsPage />
        </RequireAuth>
      }
    />
    <Route path="admin/catalogs" element={<RequireAuth allowedRoles={['admin']}><AdminCatalogsPage /></RequireAuth>} />
    <Route
      path="admin/users"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminUsersPage />
        </RequireAuth>
      }
    />
    {/* The payments console moved off `/admin` when the overview took over
        the landing page (issue #68); the page itself is unchanged. */}
    <Route
      path="admin/payments/console"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminPaymentsConsolePage />
        </RequireAuth>
      }
    />
    <Route
      path="admin/*"
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminDashboardPage />
        </RequireAuth>
      }
    />
  </>
);
import type { RouteObject } from 'react-router-dom';
import { lazyPage } from './lazy';
import { guardedSection, type RouteContext } from './route-helpers';

/** Admin console routes. Mounted under the layout in `routes/index.tsx`. React Router
 * ranks routes by how specific their path is, so order between files doesn't matter. */
export function adminRoutes(_context: RouteContext): RouteObject[] {
  return [
    guardedSection('admin', ['admin'], [
      { path: 'admin/audit', lazy: lazyPage(() => import('../pages/AdminAuditPage'), 'AdminAuditPage') },
      { path: 'admin/referrals', lazy: lazyPage(() => import('../pages/AdminReferralsPage'), 'AdminReferralsPage') },
      {
        path: 'admin/verifications',
        lazy: lazyPage(() => import('../pages/AdminVerificationsPage'), 'AdminVerificationsPage'),
      },
      {
        path: 'admin/verification',
        lazy: lazyPage(() => import('../pages/AdminVerificationPage'), 'AdminVerificationPage'),
      },
      {
        path: 'admin/verifications/:doctorProfileId',
        lazy: lazyPage(() => import('../pages/AdminVerificationDetailPage'), 'AdminVerificationDetailPage'),
      },
      { path: 'admin/disputes', lazy: lazyPage(() => import('../pages/AdminDisputesPage'), 'AdminDisputesPage') },
      {
        path: 'admin/disputes/:disputeId',
        lazy: lazyPage(() => import('../pages/AdminDisputeDetailPage'), 'AdminDisputeDetailPage'),
      },
      { path: 'admin/system', lazy: lazyPage(() => import('../pages/AdminSystemPage'), 'AdminSystemPage') },
      { path: 'admin/flags', lazy: lazyPage(() => import('../pages/AdminFlagsPage'), 'AdminFlagsPage') },
      { path: 'admin/catalogs', lazy: lazyPage(() => import('../pages/AdminCatalogsPage'), 'AdminCatalogsPage') },
      { path: 'admin/*', lazy: lazyPage(() => import('../pages/AdminDashboardPage'), 'AdminDashboardPage') },
    ]),
  ];
}
