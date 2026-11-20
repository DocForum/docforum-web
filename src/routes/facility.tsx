import type { RouteObject } from 'react-router-dom';
import { lazyPage } from './lazy';
import { guardedSection, type RouteContext } from './route-helpers';

/** Facility routes. Mounted under the layout in `routes/index.tsx`. React Router
 * ranks routes by how specific their path is, so order between files doesn't matter. */
export function facilityRoutes(_context: RouteContext): RouteObject[] {
  return [
    guardedSection('facility', ['facility'], [
      { path: 'facility/verify', lazy: lazyPage(() => import('../pages/OrderVerifyPage'), 'OrderVerifyPage') },
      {
        path: 'facility/payments',
        lazy: lazyPage(() => import('../pages/FacilityPaymentsPage'), 'FacilityPaymentsPage'),
      },
      { path: 'facility/team', lazy: lazyPage(() => import('../pages/FacilityTeamPage'), 'FacilityTeamPage') },
      {
        path: 'facility/integrations',
        lazy: lazyPage(() => import('../pages/FacilityIntegrationsPage'), 'FacilityIntegrationsPage'),
      },
      {
        path: 'facility/insights',
        lazy: lazyPage(() => import('../pages/FacilityInsightsPage'), 'FacilityInsightsPage'),
      },
      {
        path: 'facility/settings',
        lazy: lazyPage(() => import('../pages/FacilitySettingsPage'), 'FacilitySettingsPage'),
      },
      {
        path: 'facility/*',
        lazy: lazyPage(() => import('../pages/FacilityDashboardPage'), 'FacilityDashboardPage'),
      },
    ]),
  ];
}
