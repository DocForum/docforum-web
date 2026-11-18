import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n/I18nProvider';
import { HashRedirectShim } from './components/HashRedirectShim';
import { useAnalyticsPageview } from './hooks/useAnalyticsPageview';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { RequireFlag } from './components/RequireFlag';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage';
import { FacilityDashboardPage } from './pages/FacilityDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ClaimAccountPage } from './pages/ClaimAccountPage';
import { InvitePage } from './pages/InvitePage';
import { AccessLogPage } from './pages/AccessLogPage';
import { PaymentDetailPage } from './pages/PaymentDetailPage';
import { PaymentHistoryPage } from './pages/PaymentHistoryPage';
import { CareThreadPage } from './pages/CareThreadPage';
import { AccountDeletedPage } from './pages/AccountDeletedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ConsultationNote } from './features/consultation/components/ConsultationNote';
import { DoctorInbox } from './features/messaging/components/DoctorInbox';
import { DoctorPracticeInsightsPage } from './pages/DoctorPracticeInsightsPage';
import { FacilityTeamPage } from './pages/FacilityTeamPage';
import { AdminAuditPage } from './pages/AdminAuditPage';
import { AdminReferralsPage } from './pages/AdminReferralsPage';
import { AdminSystemPage } from './pages/AdminSystemPage';
import { AdminVerificationPage } from './pages/AdminVerificationPage';
import { AdminFlagsPage } from './pages/AdminFlagsPage';
import { AdminDisputesPage } from './pages/AdminDisputesPage';
import { AdminDisputeDetailPage } from './pages/AdminDisputeDetailPage';
import { AdminVerificationsPage } from './pages/AdminVerificationsPage';
import { AdminVerificationDetailPage } from './pages/AdminVerificationDetailPage';
import { OrderVerifyPage } from './pages/OrderVerifyPage';
import { FacilityPaymentsPage } from './pages/FacilityPaymentsPage';
import { FacilityIntegrationsPage } from './pages/FacilityIntegrationsPage';
import { FacilityInsightsPage } from './pages/FacilityInsightsPage';
import { FacilitySettingsPage } from './pages/FacilitySettingsPage';
import { PatientChartPage } from "./pages/PatientChartPage";
import { MessageThreadPage } from './pages/MessageThreadPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { UpdatePromptContainer } from './pwa/UpdatePromptContainer';

const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';

export default function App() {
  useAnalyticsPageview();

  return (
    <I18nProvider>
      <ErrorBoundary level="app">
        <>
          {!useHashRouter && <HashRedirectShim />}
          <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="claim-account" element={<ClaimAccountPage />} />
        <Route path="invite" element={<InvitePage />} />
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
          path="settings/notifications"
          element={
            <RequireAuth allowedRoles={['patient', 'doctor', 'facility', 'admin']}>
              <RequireFlag name="notification_preferences">
                <NotificationSettingsPage />
              </RequireFlag>
            </RequireAuth>
          }
        />
        <Route
          path="care"
          element={
            <RequireAuth allowedRoles={['patient', 'doctor']}>
              <CareThreadPage />
            </RequireAuth>
          }
        />
        <Route
          path="care/:threadId"
          element={
            <RequireAuth allowedRoles={['patient', 'doctor']}>
              <CareThreadPage />
            </RequireAuth>
          }
        />
        <Route
          path="care/threads/:threadId"
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
            <div className="container"><h1>Messages</h1><DoctorInbox /></div>
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
        {/* Notification centre (issue #107) — every signed-in role has an inbox. */}
        <Route
          path="notifications"
          element={
            <RequireAuth allowedRoles={['patient', 'doctor', 'facility', 'admin']}>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
          </Routes>
          <UpdatePromptContainer />
        </>
      </ErrorBoundary>
    </I18nProvider>
  );
}
