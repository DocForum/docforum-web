import { Outlet } from 'react-router-dom';

/** Layout route for the patient section. Its children (home, dependents,
 * health profile, facilities, settings, care thread) render into the
 * Outlet, so moving between them no longer remounts a nested <Routes>. */
export function PatientDashboardPage() {
  return <Outlet />;
}
