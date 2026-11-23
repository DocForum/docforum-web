import type { RouteObject } from 'react-router-dom';
import { todayAppointmentsQueryOptions } from '../features/doctor-today/hooks/useDoctorToday';
import { lazyPage } from './lazy';
import { guardedSection, settlePrefetch, type RouteContext } from './route-helpers';

/** Doctor routes. Mounted under the layout in `routes/index.tsx`. React Router
 * ranks routes by how specific their path is, so order between files doesn't matter. */
export function doctorRoutes({ queryClient }: RouteContext): RouteObject[] {
  return [
    guardedSection('doctor', ['doctor'], [
      {
        path: 'doctor',
        lazy: lazyPage(() => import('../pages/DoctorDashboardPage'), 'DoctorDashboardPage'),
        prefetch: (_args, token) =>
          settlePrefetch([queryClient.ensureQueryData(todayAppointmentsQueryOptions(token))]),
      },
      {
        path: 'doctor/insights',
        lazy: lazyPage(() => import('../pages/DoctorPracticeInsightsPage'), 'DoctorPracticeInsightsPage'),
      },
      {
        path: 'doctor/consultation/:appointmentId',
        // The note plus the outcome/order-issuance panel (issue #267).
        lazy: lazyPage(() => import('../pages/DoctorConsultationPage'), 'DoctorConsultationPage'),
      },
      {
        path: 'doctor/verification',
        lazy: lazyPage(() => import('../pages/DoctorVerificationPage'), 'DoctorVerificationPage'),
      },
      {
        path: 'doctor/messages',
        lazy: lazyPage(() => import('./DoctorMessagesRoute'), 'DoctorMessagesRoute'),
      },
      {
        path: 'doctor/messages/:threadId',
        lazy: lazyPage(() => import('../pages/MessageThreadPage'), 'MessageThreadPage'),
      },
      {
        path: 'doctor/patient-chart/:patientProfileId',
        lazy: lazyPage(() => import('../pages/PatientChartPage'), 'PatientChartPage'),
      },
    ]),
  ];
}
