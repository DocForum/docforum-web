import { Route } from 'react-router-dom';
import { ConsultationNote } from '../features/consultation/components/ConsultationNote';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';
import { DoctorInbox } from '../features/messaging/components/DoctorInbox';
import { DoctorPracticeInsightsPage } from '../pages/DoctorPracticeInsightsPage';
import { MessageThreadPage } from '../pages/MessageThreadPage';
import { PatientChartPage } from '../pages/PatientChartPage';
import { RequireAuth } from '../components/RequireAuth';
import { paths } from './paths';

/** Doctor routes. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const doctorRoutes = (
  <>
    <Route path={paths.doctor.root} element={
      <RequireAuth allowedRoles={['doctor']}>
        <DoctorDashboardPage />
      </RequireAuth>
    } />
    <Route path={paths.doctor.insights} element={
      <RequireAuth allowedRoles={['doctor']}>
        <DoctorPracticeInsightsPage />
      </RequireAuth>
    } />
    <Route path={paths.doctor.consultation(":appointmentId")} element={
      <RequireAuth allowedRoles={['doctor']}>
        <ConsultationNote />
      </RequireAuth>
    } />
    <Route path={paths.doctor.messages} element={
      <RequireAuth allowedRoles={['doctor']}>
        <div className="container"><h1>Messages</h1><DoctorInbox /></div>
      </RequireAuth>
    } />
    <Route path={paths.doctor.message(":threadId")} element={
      <RequireAuth allowedRoles={['doctor']}>
        <MessageThreadPage />
      </RequireAuth>
    } />
    <Route
      path={paths.doctor.patientChart(":patientProfileId")}
      element={
        <RequireAuth allowedRoles={["doctor"]}>
          <PatientChartPage />
        </RequireAuth>
      }
    />
  </>
);
