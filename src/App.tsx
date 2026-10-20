import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((module) => ({ default: module.SignupPage })));
const PatientDashboardPage = lazy(() => import('./pages/PatientDashboardPage').then((module) => ({ default: module.PatientDashboardPage })));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboardPage').then((module) => ({ default: module.DoctorDashboardPage })));
const FacilityDashboardPage = lazy(() => import('./pages/FacilityDashboardPage').then((module) => ({ default: module.FacilityDashboardPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const ClaimAccountPage = lazy(() => import('./pages/ClaimAccountPage').then((module) => ({ default: module.ClaimAccountPage })));
const AccessLogPage = lazy(() => import('./pages/AccessLogPage').then((module) => ({ default: module.AccessLogPage })));
const PaymentDetailPage = lazy(() => import('./pages/PaymentDetailPage').then((module) => ({ default: module.PaymentDetailPage })));
const PaymentHistoryPage = lazy(() => import('./pages/PaymentHistoryPage').then((module) => ({ default: module.PaymentHistoryPage })));
const CareThreadPage = lazy(() => import('./pages/CareThreadPage').then((module) => ({ default: module.CareThreadPage })));
const AccountDeletedPage = lazy(() => import('./pages/AccountDeletedPage').then((module) => ({ default: module.AccountDeletedPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const ConsultationNote = lazy(() => import('./features/consultation/components/ConsultationNote').then((module) => ({ default: module.ConsultationNote })));
const DoctorInbox = lazy(() => import('./features/messaging/components/DoctorInbox').then((module) => ({ default: module.DoctorInbox })));
const DoctorPracticeInsightsPage = lazy(() => import('./pages/DoctorPracticeInsightsPage').then((module) => ({ default: module.DoctorPracticeInsightsPage })));
const FacilityTeamPage = lazy(() => import('./pages/FacilityTeamPage').then((module) => ({ default: module.FacilityTeamPage })));
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })));
const AdminReferralsPage = lazy(() => import('./pages/AdminReferralsPage').then((module) => ({ default: module.AdminReferralsPage })));
const AdminSystemPage = lazy(() => import('./pages/AdminSystemPage').then((module) => ({ default: module.AdminSystemPage })));
const AdminFlagsPage = lazy(() => import('./pages/AdminFlagsPage').then((module) => ({ default: module.AdminFlagsPage })));
const OrderVerifyPage = lazy(() => import('./pages/OrderVerifyPage').then((module) => ({ default: module.OrderVerifyPage })));
const FacilityPaymentsPage = lazy(() => import('./pages/FacilityPaymentsPage').then((module) => ({ default: module.FacilityPaymentsPage })));
const PatientChartPage = lazy(() => import('./pages/PatientChartPage').then((module) => ({ default: module.PatientChartPage })));

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
          path="doctor/patient-chart/:patientProfileId"
          element={
            <RequireAuth allowedRoles={["doctor"]}>
              <PatientChartPage />
            </RequireAuth>
          }
        />
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
          path="facility/*"
          element={
            <RequireAuth allowedRoles={['facility']}>
              <FacilityDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminAuditPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/referrals"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminReferralsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/system"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminSystemPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/flags"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminFlagsPage />
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
