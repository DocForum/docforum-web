import { Route } from 'react-router-dom';
import { AccessLogPage } from '../pages/AccessLogPage';
import { AppointmentDetailPage } from '../pages/AppointmentDetailPage';
import { CareThreadPage } from '../pages/CareThreadPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { PatientDashboardPage } from '../pages/PatientDashboardPage';
import { PaymentDetailPage } from '../pages/PaymentDetailPage';
import { PaymentHistoryPage } from '../pages/PaymentHistoryPage';
import { RequireAuth } from '../components/RequireAuth';
import { paths } from './paths';

/** Patient routes. Mounted under the layout in App.tsx. React Router ranks
 * routes by how specific their path is, so order between files doesn't matter. */
export const patientRoutes = (
  <>
    {/* Issue-path routes (#34 `/account/access-log`, #37 `/payments`) stay
        at the literal path the issues name, guarded to patients, rather
        than being folded under /patient where the hub's nested routes
        live. #32's detail page has no path of its own, so it nests. */}
    <Route
      path={paths.accessLog}
      element={
        <RequireAuth allowedRoles={['patient']}>
          <AccessLogPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.payments}
      element={
        <RequireAuth allowedRoles={['patient']}>
          <PaymentHistoryPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.payment(":intentId")}
      element={
        <RequireAuth allowedRoles={['patient']}>
          <PaymentDetailPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.care}
      element={
        <RequireAuth allowedRoles={['patient', 'doctor']}>
          <CareThreadPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.careThread(":threadId")}
      element={
        <RequireAuth allowedRoles={['patient', 'doctor']}>
          <CareThreadPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.legacyCareThread(":threadId")}
      element={
        <RequireAuth allowedRoles={['patient', 'doctor']}>
          <CareThreadPage />
        </RequireAuth>
      }
    />
    <Route
      path={paths.patient.order(":orderId")}
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
      path={paths.appointment(":id")}
      element={
        <RequireAuth allowedRoles={['patient']}>
          <AppointmentDetailPage />
        </RequireAuth>
      }
    />
    <Route
      path={`${paths.patient.root}/*`}
      element={
        <RequireAuth allowedRoles={['patient']}>
          <PatientDashboardPage />
        </RequireAuth>
      }
    />
  </>
);
