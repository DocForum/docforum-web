import { Route } from 'react-router-dom';
import { FacilityDashboardPage } from '../pages/FacilityDashboardPage';
import { FacilityInsightsPage } from '../pages/FacilityInsightsPage';
import { FacilityIntegrationsPage } from '../pages/FacilityIntegrationsPage';
import { FacilityPaymentsPage } from '../pages/FacilityPaymentsPage';
import { FacilitySettingsPage } from '../pages/FacilitySettingsPage';
import { FacilityTeamPage } from '../pages/FacilityTeamPage';
import { OrderVerifyPage } from '../pages/OrderVerifyPage';
import { RequireAuth } from '../components/RequireAuth';
import { paths } from './paths';

/** Facility routes. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const facilityRoutes = (
  <>
    <Route
      path={paths.facility.verify}
      element={
        <RequireAuth allowedRoles={['facility']}>
          <OrderVerifyPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.facility.payments}
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityPaymentsPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.facility.team}
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityTeamPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.facility.integrations}
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityIntegrationsPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.facility.insights}
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityInsightsPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.facility.settings}
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilitySettingsPage />
        </RequireAuth>
      }
    />
    <Route
      path={`${paths.facility.root}/*`}
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityDashboardPage />
        </RequireAuth>
      }
    />
  </>
);
