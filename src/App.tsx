import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { FacilityDashboardPage } from './pages/FacilityDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ClaimAccountPage } from './pages/ClaimAccountPage';
import { CareThreadPage } from './pages/CareThreadPage';
import { AccountDeletedPage } from './pages/AccountDeletedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ConsultationNote } from './features/consultation/components/ConsultationNote';
import { DoctorInbox } from './features/messaging/components/DoctorInbox';
import { DoctorPracticeInsightsPage } from './pages/DoctorPracticeInsightsPage';
import { FacilityTeamPage } from './pages/FacilityTeamPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="claim-account" element={<ClaimAccountPage />} />
        <Route path="account-deleted" element={<AccountDeletedPage />} />
        <Route
          path="care/*"
          element={
            <RequireAuth allowedRoles={['patient', 'doctor']}>
              <CareThreadPage />
            </RequireAuth>
          }
        />
        <Route
          path="patient/*"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <PatientDashboardPage />
            </RequireAuth>
          }
        />
        <Route path="doctor" element={
          <RequireAuth allowedRoles={['doctor']}>
            <DoctorDashboardPage />
          </RequireAuth>
        } />
        <Route path="doctor/insights" element={
          <RequireAuth allowedRoles={['doctor']}>
            <DoctorPracticeInsightsPage />
          </RequireAuth>
        } />
        <Route path="doctor/consultation/:appointmentId" element={
          <RequireAuth allowedRoles={['doctor']}>
            <ConsultationNote />
          </RequireAuth>
        } />
        <Route path="doctor/messages" element={
          <RequireAuth allowedRoles={['doctor']}>
            <DoctorInbox />
          </RequireAuth>
        } />
        <Route
          path="facility/team"
          element={
            <RequireAuth allowedRoles={['facility']}>
              <FacilityTeamPage />
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
        <Route
          path="admin/*"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
