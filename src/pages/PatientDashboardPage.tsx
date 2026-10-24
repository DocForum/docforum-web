import { Outlet } from 'react-router-dom';
import { useProfileBootstrap } from '../features/patients/hooks/useProfileBootstrap';

/** Layout route for the patient section. Its children (home, dependents,
 * health profile, facilities, settings, care thread) render into the
 * Outlet, so moving between them no longer remounts a nested <Routes>. */
export function PatientDashboardPage() {
  // Profile-scoped reads (`/patients/:profileId/...`) need the caller's own
  // profile id, which the auth session does not carry.
  useProfileBootstrap();

  return <Outlet />;
}
