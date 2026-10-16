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
import { AccessLogPage } from './pages/AccessLogPage';
import { PaymentDetailPage } from './pages/PaymentDetailPage';
import { PaymentHistoryPage } from './pages/PaymentHistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="claim-account" element={<ClaimAccountPage />} />
        {/* Issue-path routes (#34 `/account/access-log`, #37 `/payments`) stay
            at the literal path the issues name, guarded to patients, rather
            than being folded under /patient where the hub's nested routes
            live. #32's detail page has no path of its own, so it nests. */}
        <Route
          path="account/access-log"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <AccessLogPage />
            </RequireAuth>
          }
        />
        <Route
          path="payments"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <PaymentHistoryPage />
            </RequireAuth>
          }
        />
        <Route
          path="payments/:intentId"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <PaymentDetailPage />
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
        <Route
          path="doctor/*"
          element={
            <RequireAuth allowedRoles={['doctor']}>
              <DoctorDashboardPage />
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
