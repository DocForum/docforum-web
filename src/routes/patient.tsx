import type { RouteObject } from 'react-router-dom';
import { myAppointmentsQueryOptions } from '../features/appointments/hooks/useAppointments';
import { paymentHistoryQueryOptions } from '../features/payments/hooks/usePaymentHistory';
import { lazyPage } from './lazy';
import { needsMyAppointments } from './patient-prefetch';
import { guardedSection, settlePrefetch, type RouteContext } from './route-helpers';

/** Patient routes. Mounted under the layout in `routes/index.tsx`. React Router
 * ranks routes by how specific their path is, so order between files doesn't matter. */
export function patientRoutes({ queryClient }: RouteContext): RouteObject[] {
  return [
    // Issue-path routes (#34 `/account/access-log`, #37 `/payments`) stay
    // at the literal path the issues name, guarded to patients, rather
    // than being folded under /patient where the hub's nested routes
    // live. #32's detail page has no path of its own, so it nests.
    guardedSection('patient', ['patient'], [
      {
        path: 'account/access-log',
        lazy: lazyPage(() => import('../pages/AccessLogPage'), 'AccessLogPage'),
      },
      {
        path: 'payments',
        lazy: lazyPage(() => import('../pages/PaymentHistoryPage'), 'PaymentHistoryPage'),
        // Read-only history: prefetching a list never moves money (#113's
        // "no optimistic money movement" rule is about writes).
        prefetch: (_args, token) =>
          settlePrefetch([queryClient.ensureInfiniteQueryData(paymentHistoryQueryOptions(token))]),
      },
      {
        path: 'payments/:intentId',
        lazy: lazyPage(() => import('../pages/PaymentDetailPage'), 'PaymentDetailPage'),
      },
      // Deep-linkable appointment detail (issue #14). Top-level rather than
      // nested under `patient/*` because the issue specifies the literal
      // path `/appointments/:id`; the care hub also links to its own nested
      // `/patient/appointments/:appointmentId`, and the page reads either
      // param. The page resolves `:id` against `/appointments/mine`.
      {
        path: 'appointments/:id',
        lazy: lazyPage(() => import('../pages/AppointmentDetailPage'), 'AppointmentDetailPage'),
        prefetch: (_args, token) =>
          settlePrefetch([queryClient.ensureQueryData(myAppointmentsQueryOptions(token))]),
      },
      {
        path: 'patient/*',
        lazy: lazyPage(() => import('../pages/PatientDashboardPage'), 'PatientDashboardPage'),
        // Only the hub's home and its appointment pages read
        // `/appointments/mine`. Every other `/patient/*` page (facilities,
        // orders, settings, …) must not wait on a request it never uses.
        prefetch: ({ params }, token) =>
          needsMyAppointments(params['*'])
            ? settlePrefetch([queryClient.ensureQueryData(myAppointmentsQueryOptions(token))])
            : undefined,
      },
    ]),
    // Care threads are shared by both sides of the conversation.
    guardedSection('care', ['patient', 'doctor'], [
      { path: 'care', lazy: lazyPage(() => import('../pages/CareThreadPage'), 'CareThreadPage') },
      { path: 'care/:threadId', lazy: lazyPage(() => import('../pages/CareThreadPage'), 'CareThreadPage') },
      {
        path: 'care/threads/:threadId',
        lazy: lazyPage(() => import('../pages/CareThreadPage'), 'CareThreadPage'),
      },
    ]),
  ];
}
