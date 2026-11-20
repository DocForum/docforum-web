import { Route } from 'react-router-dom';
import { FacilityDashboardPage } from '../pages/FacilityDashboardPage';
import { FacilityInsightsPage } from '../pages/FacilityInsightsPage';
import { FacilityIntegrationsPage } from '../pages/FacilityIntegrationsPage';
import { FacilityPaymentsPage } from '../pages/FacilityPaymentsPage';
import { FacilitySettingsPage } from '../pages/FacilitySettingsPage';
import { FacilityTeamPage } from '../pages/FacilityTeamPage';
import { OrderVerifyPage } from '../pages/OrderVerifyPage';
import { RequireAuth } from '../components/RequireAuth';

/** Facility routes. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const facilityRoutes = (
  <>
    <Route
      path="facility/verify"
      element={
        <RequireAuth allowedRoles={['facility']}>
          <OrderVerifyPage />
        </RequireAuth>
      }
    />
    <Route
      path="facility/payments"
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityPaymentsPage />
        </RequireAuth>
      }
    />
    <Route
      path="facility/team"
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityTeamPage />
        </RequireAuth>
      }
    />
    <Route
      path="facility/integrations"
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityIntegrationsPage />
        </RequireAuth>
      }
    />
    <Route
      path="facility/insights"
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityInsightsPage />
        </RequireAuth>
      }
    />
    <Route
      path="facility/settings"
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilitySettingsPage />
        </RequireAuth>
      }
    />
    <Route
      path="facility/*"
      element={
        <RequireAuth allowedRoles={['facility']}>
          <FacilityDashboardPage />
        </RequireAuth>
      }
    />
  </>
);
