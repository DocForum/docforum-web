import { Route } from 'react-router-dom';
import { AdminAuditPage } from '../pages/AdminAuditPage';
import { AdminCatalogsPage } from '../pages/AdminCatalogsPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminDisputeDetailPage } from '../pages/AdminDisputeDetailPage';
import { AdminDisputesPage } from '../pages/AdminDisputesPage';
import { AdminFlagsPage } from '../pages/AdminFlagsPage';
import { AdminReferralsPage } from '../pages/AdminReferralsPage';
import { AdminSystemPage } from '../pages/AdminSystemPage';
import { AdminVerificationDetailPage } from '../pages/AdminVerificationDetailPage';
import { AdminVerificationPage } from '../pages/AdminVerificationPage';
import { AdminVerificationsPage } from '../pages/AdminVerificationsPage';
import { RequireAuth } from '../components/RequireAuth';
import { paths } from './paths';

/** Admin console routes. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const adminRoutes = (
  <>
    <Route
      path={paths.admin.audit}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminAuditPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.referrals}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminReferralsPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.verifications}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminVerificationsPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.verification}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminVerificationPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.verificationDoctor(":doctorProfileId")}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminVerificationDetailPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.disputes}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminDisputesPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.dispute(":disputeId")}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminDisputeDetailPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.system}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminSystemPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.admin.flags}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminFlagsPage />
        </RequireAuth>
      }
    />
    <Route path={paths.admin.catalogs} element={<RequireAuth allowedRoles={['admin']}><AdminCatalogsPage /></RequireAuth>} />
    <Route
      path={`${paths.admin.root}/*`}
      element={
        <RequireAuth allowedRoles={['admin']}>
          <AdminDashboardPage />
        </RequireAuth>
      }
    />
  </>
);
