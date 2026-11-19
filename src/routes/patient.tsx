import { Route } from 'react-router-dom';
import { AccessLogPage } from '../pages/AccessLogPage';
import { AppointmentDetailPage } from '../pages/AppointmentDetailPage';
import { CareThreadPage } from '../pages/CareThreadPage';
import { LabResultDetailPage } from '../pages/LabResultDetailPage';
import { LabResultsPage } from '../pages/LabResultsPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { PatientDashboardPage } from '../pages/PatientDashboardPage';
import { PaymentDetailPage } from '../pages/PaymentDetailPage';
import { PaymentHistoryPage } from '../pages/PaymentHistoryPage';
import { RequireAuth } from '../components/RequireAuth';

/** Patient routes. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const patientRoutes = (
  <>
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
      path="patient/results"
      element={
        <RequireAuth allowedRoles={['patient']}>
          <LabResultsPage />
        </RequireAuth>
      }
    />
    <Route
      path="patient/results/:resultId"
      element={
        <RequireAuth allowedRoles={['patient']}>
          <LabResultDetailPage />
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
    {/* Deep-linkable appointment detail (issue #14). Top-level rather than
        nested under `patient/*` because the issue specifies the literal
        path `/appointments/:id`; the care hub also links to its own nested
        `/patient/appointments/:appointmentId`, and the page reads either
        param. */}
    <Route
      path="appointments/:id"
      element={
        <RequireAuth allowedRoles={['patient']}>
          <AppointmentDetailPage />
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
  </>
);
