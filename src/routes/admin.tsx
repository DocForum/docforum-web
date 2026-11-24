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
      { path: 'admin/users', lazy: lazyPage(() => import('../pages/AdminUsersPage'), 'AdminUsersPage') },
      // The payments console moved off `/admin` when the overview took over
      // the landing page (issue #68); the page itself is unchanged.
      {
        path: 'admin/payments/console',
        lazy: lazyPage(() => import('../pages/AdminPaymentsConsolePage'), 'AdminPaymentsConsolePage'),
      },
      { path: 'admin/*', lazy: lazyPage(() => import('../pages/AdminDashboardPage'), 'AdminDashboardPage') },
    ]),
  ];
}
