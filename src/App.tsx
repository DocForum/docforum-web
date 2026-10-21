import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { HashRedirectShim } from './components/HashRedirectShim';
import { useAnalyticsPageview } from './hooks/useAnalyticsPageview';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
const HomePage = lazy(() => import('./pages/HomePage').then(({ HomePage }) => ({ default: HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(({ SignupPage }) => ({ default: SignupPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(({ PrivacyPage }) => ({ default: PrivacyPage })));
const PatientDashboardPage = lazy(() => import('./pages/PatientDashboardPage').then(({ PatientDashboardPage }) => ({ default: PatientDashboardPage })));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboardPage').then(({ DoctorDashboardPage }) => ({ default: DoctorDashboardPage })));
const FacilityDashboardPage = lazy(() => import('./pages/FacilityDashboardPage').then(({ FacilityDashboardPage }) => ({ default: FacilityDashboardPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(({ AdminDashboardPage }) => ({ default: AdminDashboardPage })));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then(({ OrderDetailPage }) => ({ default: OrderDetailPage })));
const ClaimAccountPage = lazy(() => import('./pages/ClaimAccountPage').then(({ ClaimAccountPage }) => ({ default: ClaimAccountPage })));
const AccessLogPage = lazy(() => import('./pages/AccessLogPage').then(({ AccessLogPage }) => ({ default: AccessLogPage })));
const PaymentDetailPage = lazy(() => import('./pages/PaymentDetailPage').then(({ PaymentDetailPage }) => ({ default: PaymentDetailPage })));
const PaymentHistoryPage = lazy(() => import('./pages/PaymentHistoryPage').then(({ PaymentHistoryPage }) => ({ default: PaymentHistoryPage })));
const CareThreadPage = lazy(() => import('./pages/CareThreadPage').then(({ CareThreadPage }) => ({ default: CareThreadPage })));
const AccountDeletedPage = lazy(() => import('./pages/AccountDeletedPage').then(({ AccountDeletedPage }) => ({ default: AccountDeletedPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(({ NotFoundPage }) => ({ default: NotFoundPage })));
const ConsultationNote = lazy(() => import('./features/consultation/components/ConsultationNote').then(({ ConsultationNote }) => ({ default: ConsultationNote })));
const DoctorInbox = lazy(() => import('./features/messaging/components/DoctorInbox').then(({ DoctorInbox }) => ({ default: DoctorInbox })));
const DoctorPracticeInsightsPage = lazy(() => import('./pages/DoctorPracticeInsightsPage').then(({ DoctorPracticeInsightsPage }) => ({ default: DoctorPracticeInsightsPage })));
const FacilityTeamPage = lazy(() => import('./pages/FacilityTeamPage').then(({ FacilityTeamPage }) => ({ default: FacilityTeamPage })));
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage').then(({ AdminAuditPage }) => ({ default: AdminAuditPage })));
const AdminReferralsPage = lazy(() => import('./pages/AdminReferralsPage').then(({ AdminReferralsPage }) => ({ default: AdminReferralsPage })));
const AdminSystemPage = lazy(() => import('./pages/AdminSystemPage').then(({ AdminSystemPage }) => ({ default: AdminSystemPage })));
const AdminVerificationPage = lazy(() => import('./pages/AdminVerificationPage').then(({ AdminVerificationPage }) => ({ default: AdminVerificationPage })));
const AdminFlagsPage = lazy(() => import('./pages/AdminFlagsPage').then(({ AdminFlagsPage }) => ({ default: AdminFlagsPage })));
const AdminDisputesPage = lazy(() => import('./pages/AdminDisputesPage').then(({ AdminDisputesPage }) => ({ default: AdminDisputesPage })));
const AdminDisputeDetailPage = lazy(() => import('./pages/AdminDisputeDetailPage').then(({ AdminDisputeDetailPage }) => ({ default: AdminDisputeDetailPage })));
const AdminVerificationsPage = lazy(() => import('./pages/AdminVerificationsPage').then(({ AdminVerificationsPage }) => ({ default: AdminVerificationsPage })));
const AdminVerificationDetailPage = lazy(() => import('./pages/AdminVerificationDetailPage').then(({ AdminVerificationDetailPage }) => ({ default: AdminVerificationDetailPage })));
const OrderVerifyPage = lazy(() => import('./pages/OrderVerifyPage').then(({ OrderVerifyPage }) => ({ default: OrderVerifyPage })));
const FacilityPaymentsPage = lazy(() => import('./pages/FacilityPaymentsPage').then(({ FacilityPaymentsPage }) => ({ default: FacilityPaymentsPage })));
const FacilityInsightsPage = lazy(() => import('./pages/FacilityInsightsPage').then(({ FacilityInsightsPage }) => ({ default: FacilityInsightsPage })));
const PatientChartPage = lazy(() => import('./pages/PatientChartPage').then(({ PatientChartPage }) => ({ default: PatientChartPage })));
const MessageThreadPage = lazy(() => import('./pages/MessageThreadPage').then(({ MessageThreadPage }) => ({ default: MessageThreadPage })));

const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';

export default function App() {
  useAnalyticsPageview();

  return (
    <>
      {!useHashRouter && <HashRedirectShim />}
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
          path="patient/orders/:orderId"
          element={
            <RequireAuth allowedRoles={['patient']}>
              <OrderDetailPage />
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
        <Route path="doctor/messages/:threadId" element={
          <RequireAuth allowedRoles={['doctor']}>
            <MessageThreadPage />
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
          path="facility/insights"
          element={
            <RequireAuth allowedRoles={['facility']}>
              <FacilityInsightsPage />
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
          path="admin/verifications"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminVerificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/verification"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminVerificationPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/verifications/:doctorProfileId"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminVerificationDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/disputes"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminDisputesPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/disputes/:disputeId"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminDisputeDetailPage />
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
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </>
  );
}
