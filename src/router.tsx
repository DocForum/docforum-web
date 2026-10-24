import type { LoaderFunctionArgs, RouteObject } from 'react-router-dom';
import {
  Outlet,
  createBrowserRouter,
  createHashRouter,
  createMemoryRouter,
  redirect,
} from 'react-router-dom';
import type { QueryClient } from '@tanstack/react-query';
import { HashRedirectShim } from './components/HashRedirectShim';
import { Layout } from './components/Layout';
import { RequireFlag } from './components/RequireFlag';
import { RouteError } from './components/RouteError';
import { RouteLoading } from './components/RouteLoading';
import { useAnalyticsPageview } from './hooks/useAnalyticsPageview';
import { restoreSession, useAuthStore } from './store/auth-store';
import { useProfileStore } from './store/profile-store';
import type { Role } from './types/models';

import * as queueService from './services/queue-service';
import * as dependentService from './services/dependents-service';
import * as healthService from './services/health-profile-service';
import * as careThreadService from './services/care-thread-service';
import * as consultationService from './services/consultation-service';
import * as messagingService from './services/messaging-service';
import * as auditService from './services/audit-service';
import * as flagsService from './services/feature-flags-service';
import * as systemService from './services/system-health-service';
import * as referralsService from './services/admin-referrals-service';
import * as facilityTeamService from './services/facility-team-service';
import * as paymentsService from './services/payments-service';
import * as accountService from './services/account-service';
import * as insightsService from './services/insights-service';

import {
  accountKeys,
  appointmentKeys,
  auditKeys,
  careThreadKeys,
  consultationKeys,
  dependentKeys,
  facilityKeys,
  flagKeys,
  healthKeys,
  insightKeys,
  messageKeys,
  paymentKeys,
  queueKeys,
  referralKeys,
  systemKeys,
} from './query-keys';
import { parseAuditSearch, toAuditQuery } from './features/admin-audit/filters';
import { parseQueueSearch } from './features/admin-referrals/queue';

// Loaders seed React Query before the route renders. 30s of freshness means
// a prefetched result is used immediately instead of being refetched on
// mount; every page still refetches normally after that.
const LOADER_STALE_MS = 30_000;
const DEFAULT_THREAD_LIMIT = 10;

const HOME_BY_ROLE: Record<Role, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
  admin: '/admin',
};

export function homePathForRole(role: Role): string {
  return HOME_BY_ROLE[role] ?? '/';
}

type Prefetch = (args: LoaderFunctionArgs, accessToken: string) => Promise<unknown>;

/**
 * Loader-based route guard. It waits for the one boot-time session restore
 * (issue #9's refresh-on-reload contract), redirects signed-out users to the
 * login screen, sends signed-in users without the right role to their own
 * dashboard, and only then prefetches the route's data.
 */
function guardedLoader(allowedRoles: Role[], prefetch?: Prefetch) {
  return async (args: LoaderFunctionArgs) => {
    await restoreSession();

    const { user, accessToken } = useAuthStore.getState();
    if (!user || !accessToken) throw redirect('/login');
    if (!allowedRoles.includes(user.role)) throw redirect(homePathForRole(user.role));

    if (prefetch) {
      // A prefetch failure must not turn a page with its own inline error
      // state into a route-level error screen. Let the component retry and
      // report it as it always did.
      await prefetch(args, accessToken).catch(() => undefined);
    }
    return null;
  };
}

function prefetch<T>(queryClient: QueryClient, queryKey: readonly unknown[], queryFn: () => Promise<T>) {
  return queryClient.ensureQueryData({ queryKey, queryFn, staleTime: LOADER_STALE_MS });
}

function AppLayout() {
  useAnalyticsPageview();
  const useHashRouter = import.meta.env.VITE_USE_HASH_ROUTER === 'true';

  return (
    <>
      {!useHashRouter && <HashRedirectShim />}
      <Layout />
    </>
  );
}

export function createAppRoutes(queryClient: QueryClient): RouteObject[] {
  const routeError = <RouteError />;

  const prefetchDoctorDashboard: Prefetch = async (_args, accessToken) => {
    await Promise.all([
      prefetch(queryClient, queueKeys.today(), () => queueService.listQueue(accessToken)),
      prefetch(queryClient, appointmentKeys.today(), () =>
        queueService.listTodayAppointments(accessToken),
      ),
      prefetch(queryClient, queueKeys.runningDelay(), () => queueService.getRunningDelay(accessToken)),
    ]);
  };

  const prefetchDependents: Prefetch = (_args, accessToken) =>
    prefetch(queryClient, dependentKeys.all, () => dependentService.listDependents(accessToken));

  const prefetchHealth: Prefetch = (_args, accessToken) => {
    const profileId = useProfileStore.getState().selectedProfileId;
    if (!profileId) return Promise.resolve(undefined);
    return Promise.all(
      (['allergies', 'conditions', 'medications'] as const).map((section) =>
        prefetch(queryClient, healthKeys.section(profileId, section), () =>
          healthService.listHealthEntries(profileId, section, accessToken),
        ),
      ),
    );
  };

  const prefetchCareThreads: Prefetch = (_args, accessToken) => {
    const profileId = useProfileStore.getState().selectedProfileId;
    if (!profileId) return Promise.resolve(undefined);
    return prefetch(queryClient, careThreadKeys.list(profileId), () =>
      careThreadService.getCareThreads(profileId, accessToken),
    );
  };

  const prefetchConsultation: Prefetch = async (args, accessToken) => {
    const appointmentId = args.params.appointmentId;
    if (!appointmentId) return;
    await prefetch(queryClient, consultationKeys.note(appointmentId), () =>
      consultationService.getConsultationNote(appointmentId, accessToken),
    );
  };

  const prefetchInbox: Prefetch = (_args, accessToken) =>
    Promise.all([
      prefetch(queryClient, messageKeys.threads('all', null, DEFAULT_THREAD_LIMIT), () =>
        messagingService.listThreads(
          { filter: 'all', cursor: null, limit: DEFAULT_THREAD_LIMIT },
          accessToken,
        ),
      ),
    ]);

  const prefetchAudit: Prefetch = (args, accessToken) => {
    const { filters } = parseAuditSearch(new URL(args.request.url).searchParams);
    const query = toAuditQuery(filters, 50);
    const queryKey = auditKeys.page(filters.tab, query);
    return filters.tab === 'events'
      ? prefetch(queryClient, queryKey, () => auditService.listAuditEvents(query, accessToken))
      : prefetch(queryClient, queryKey, () => auditService.listAccessLogs(query, accessToken));
  };

  const prefetchFlags: Prefetch = (_args, accessToken) =>
    Promise.all([
      prefetch(queryClient, flagKeys.list(), () => flagsService.listFeatureFlags(accessToken)),
      prefetch(queryClient, flagKeys.history(), () =>
        auditService.listAuditEvents({ entityType: 'FeatureFlag', limit: 200 }, accessToken),
      ),
    ]);

  const prefetchSystem: Prefetch = (_args, accessToken) =>
    Promise.all([
      // Must cache the same shape as useReadiness, which wraps the report
      // with its round-trip time.
      prefetch(queryClient, systemKeys.readiness(), async () => {
        const started = performance.now();
        const report = await systemService.getReadiness(accessToken);
        return { report, respondedInMs: performance.now() - started };
      }),
      prefetch(queryClient, systemKeys.jobs(), () => systemService.listJobs(accessToken)),
      prefetch(queryClient, systemKeys.outbox(), () => systemService.getOutboxSummary(accessToken)),
    ]);

  const prefetchReferrals: Prefetch = (args, accessToken) => {
    const { olderThan } = parseQueueSearch(new URL(args.request.url).searchParams);
    // useStuckReferrals is an infinite query; cache the same InfiniteData
    // shape or the first render would treat the page as a list of pages.
    return queryClient.prefetchInfiniteQuery({
      queryKey: referralKeys.stuck(olderThan),
      queryFn: ({ pageParam }) =>
        referralsService.listStuckReferrals(
          { olderThan, cursor: pageParam as string | null },
          accessToken,
        ),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage: { nextCursor?: string | null }) => lastPage.nextCursor ?? undefined,
      staleTime: LOADER_STALE_MS,
    });
  };

  const prefetchFacilityQueue: Prefetch = (_args, accessToken) =>
    prefetch(queryClient, facilityKeys.queue('fac-main'), () =>
      facilityTeamService.getFulfillmentQueue('fac-main', accessToken),
    );

  const prefetchFacilityTeam: Prefetch = (_args, accessToken) =>
    prefetch(queryClient, facilityKeys.members('fac-main'), () =>
      facilityTeamService.listFacilityMembers('fac-main', accessToken),
    );

  const prefetchFacilityLedger: Prefetch = (_args, accessToken) =>
    prefetch(
      queryClient,
      paymentKeys.ledger('fac-main', { status: 'all', asset: 'all' }),
      () => paymentsService.getFacilityPayoutLedger('fac-main', accessToken, { status: 'all', asset: 'all' }),
    );

  const prefetchInsights: Prefetch = (_args, accessToken) =>
    prefetch(queryClient, insightKeys.params({ preset: '30d' }), () =>
      insightsService.getDoctorPracticeInsights(accessToken, { preset: '30d' }),
    );

  const prefetchAccountSettings: Prefetch = (_args, accessToken) =>
    prefetch(queryClient, accountKeys.dataExport(), () => accountService.getDataExportStatus(accessToken));

  const page = <T extends Record<string, unknown>>(
    importer: () => Promise<T>,
    exportName: keyof T,
  ): RouteObject['lazy'] => async () => ({ Component: (await importer())[exportName] as never });

  return [
    {
      path: '/',
      element: <AppLayout />,
      hydrateFallbackElement: <RouteLoading />,
      errorElement: routeError,
      children: [
        { index: true, lazy: page(() => import('./pages/HomePage'), 'HomePage') },
        { path: 'login', lazy: page(() => import('./pages/LoginPage'), 'LoginPage') },
        { path: 'signup', lazy: page(() => import('./pages/SignupPage'), 'SignupPage') },
        { path: 'claim-account', lazy: page(() => import('./pages/ClaimAccountPage'), 'ClaimAccountPage') },
        { path: 'account-deleted', lazy: page(() => import('./pages/AccountDeletedPage'), 'AccountDeletedPage') },
        {
          path: 'settings/notifications',
          loader: guardedLoader(['patient', 'doctor', 'facility', 'admin']),
          element: (
            <RequireFlag name="notification_preferences">
              <Outlet />
            </RequireFlag>
          ),
          children: [
            {
              index: true,
              lazy: page(() => import('./pages/NotificationSettingsPage'), 'NotificationSettingsPage'),
            },
          ],
        },
        { path: 'privacy', lazy: page(() => import('./pages/PrivacyPage'), 'PrivacyPage') },

        {
          path: 'account/access-log',
          loader: guardedLoader(['patient']),
          lazy: page(() => import('./pages/AccessLogPage'), 'AccessLogPage'),
        },
        {
          path: 'payments',
          loader: guardedLoader(['patient']),
          lazy: page(() => import('./pages/PaymentHistoryPage'), 'PaymentHistoryPage'),
        },
        {
          path: 'payments/:intentId',
          loader: guardedLoader(['patient']),
          lazy: page(() => import('./pages/PaymentDetailPage'), 'PaymentDetailPage'),
        },

        {
          path: 'care',
          loader: guardedLoader(['patient', 'doctor'], prefetchCareThreads),
          errorElement: routeError,
          lazy: page(() => import('./pages/CareThreadPage'), 'CareThreadPage'),
        },
        {
          path: 'care/:threadId',
          loader: guardedLoader(['patient', 'doctor'], prefetchCareThreads),
          errorElement: routeError,
          lazy: page(() => import('./pages/CareThreadPage'), 'CareThreadPage'),
        },
        {
          path: 'care/threads/:threadId',
          loader: guardedLoader(['patient', 'doctor'], prefetchCareThreads),
          errorElement: routeError,
          lazy: page(() => import('./pages/CareThreadPage'), 'CareThreadPage'),
        },

        {
          path: 'patient',
          loader: guardedLoader(['patient']),
          errorElement: routeError,
          lazy: page(() => import('./pages/PatientDashboardPage'), 'PatientDashboardPage'),
          children: [
            {
              index: true,
              loader: guardedLoader(['patient']),
              lazy: page(() => import('./pages/PatientHomePage'), 'PatientHomePage'),
            },
            {
              path: 'dependents',
              loader: guardedLoader(['patient'], prefetchDependents),
              lazy: page(() => import('./pages/DependentsPage'), 'DependentsPage'),
            },
            {
              path: 'health',
              loader: guardedLoader(['patient'], prefetchHealth),
              lazy: page(() => import('./pages/HealthProfilePage'), 'HealthProfilePage'),
            },
            {
              path: 'facilities',
              loader: guardedLoader(['patient']),
              lazy: page(() => import('./pages/FacilityFinderPage'), 'FacilityFinderPage'),
            },
            {
              path: 'orders',
              loader: guardedLoader(['patient']),
              lazy: page(() => import('./pages/OrdersPage'), 'OrdersPage'),
            },
            {
              path: 'orders/:orderId',
              loader: guardedLoader(['patient']),
              lazy: page(() => import('./pages/OrderDetailPage'), 'OrderDetailPage'),
            },
            {
              path: 'messages/:threadId',
              loader: guardedLoader(['patient']),
              lazy: page(() => import('./pages/MessageThreadPage'), 'MessageThreadPage'),
            },
            {
              path: 'settings',
              loader: guardedLoader(['patient'], prefetchAccountSettings),
              lazy: page(() => import('./pages/AccountSettingsPage'), 'AccountSettingsPage'),
            },
            {
              path: 'appointments/:appointmentId',
              loader: guardedLoader(['patient']),
              lazy: page(() => import('./pages/AppointmentDetailPage'), 'AppointmentDetailPage'),
            },
            {
              path: 'care',
              loader: guardedLoader(['patient'], prefetchCareThreads),
              lazy: page(() => import('./pages/CareThreadPage'), 'CareThreadPage'),
            },
            {
              path: 'care/:threadId',
              loader: guardedLoader(['patient'], prefetchCareThreads),
              lazy: page(() => import('./pages/CareThreadPage'), 'CareThreadPage'),
            },
          ],
        },

        {
          path: 'doctor',
          loader: guardedLoader(['doctor'], prefetchDoctorDashboard),
          errorElement: routeError,
          lazy: page(() => import('./pages/DoctorDashboardPage'), 'DoctorDashboardPage'),
        },
        {
          path: 'doctor/insights',
          loader: guardedLoader(['doctor'], prefetchInsights),
          lazy: page(() => import('./pages/DoctorPracticeInsightsPage'), 'DoctorPracticeInsightsPage'),
        },
        {
          path: 'doctor/consultation/:appointmentId',
          loader: guardedLoader(['doctor'], prefetchConsultation),
          lazy: page(() => import('./features/consultation/components/ConsultationNote'), 'ConsultationNote'),
        },
        {
          path: 'doctor/messages',
          loader: guardedLoader(['doctor'], prefetchInbox),
          element: (
            <div className="container">
              <h1>Messages</h1>
              <Outlet />
            </div>
          ),
          children: [
            {
              index: true,
              lazy: page(() => import('./features/messaging/components/DoctorInbox'), 'DoctorInbox'),
            },
          ],
        },
        {
          path: 'doctor/messages/:threadId',
          loader: guardedLoader(['doctor']),
          lazy: page(() => import('./pages/MessageThreadPage'), 'MessageThreadPage'),
        },
        {
          path: 'doctor/patient-chart/:patientProfileId',
          loader: guardedLoader(['doctor']),
          lazy: page(() => import('./pages/PatientChartPage'), 'PatientChartPage'),
        },

        {
          path: 'facility',
          loader: guardedLoader(['facility'], prefetchFacilityQueue),
          errorElement: routeError,
          lazy: page(() => import('./pages/FacilityDashboardPage'), 'FacilityDashboardPage'),
        },
        {
          path: 'facility/verify',
          loader: guardedLoader(['facility']),
          lazy: page(() => import('./pages/OrderVerifyPage'), 'OrderVerifyPage'),
        },
        {
          path: 'facility/payments',
          loader: guardedLoader(['facility'], prefetchFacilityLedger),
          lazy: page(() => import('./pages/FacilityPaymentsPage'), 'FacilityPaymentsPage'),
        },
        {
          path: 'facility/team',
          loader: guardedLoader(['facility'], prefetchFacilityTeam),
          lazy: page(() => import('./pages/FacilityTeamPage'), 'FacilityTeamPage'),
        },
        {
          path: 'facility/integrations',
          loader: guardedLoader(['facility']),
          lazy: page(() => import('./pages/FacilityIntegrationsPage'), 'FacilityIntegrationsPage'),
        },
        {
          path: 'facility/insights',
          loader: guardedLoader(['facility']),
          lazy: page(() => import('./pages/FacilityInsightsPage'), 'FacilityInsightsPage'),
        },
        {
          path: 'facility/*',
          loader: guardedLoader(['facility'], prefetchFacilityQueue),
          errorElement: routeError,
          lazy: page(() => import('./pages/FacilityDashboardPage'), 'FacilityDashboardPage'),
        },

        {
          path: 'admin',
          loader: guardedLoader(['admin']),
          errorElement: routeError,
          lazy: page(() => import('./pages/AdminDashboardPage'), 'AdminDashboardPage'),
        },
        {
          path: 'admin/audit',
          loader: guardedLoader(['admin'], prefetchAudit),
          lazy: page(() => import('./pages/AdminAuditPage'), 'AdminAuditPage'),
        },
        {
          path: 'admin/referrals',
          loader: guardedLoader(['admin'], prefetchReferrals),
          lazy: page(() => import('./pages/AdminReferralsPage'), 'AdminReferralsPage'),
        },
        {
          path: 'admin/system',
          loader: guardedLoader(['admin'], prefetchSystem),
          lazy: page(() => import('./pages/AdminSystemPage'), 'AdminSystemPage'),
        },
        {
          path: 'admin/flags',
          loader: guardedLoader(['admin'], prefetchFlags),
          lazy: page(() => import('./pages/AdminFlagsPage'), 'AdminFlagsPage'),
        },
        {
          path: 'admin/verifications',
          loader: guardedLoader(['admin']),
          lazy: page(() => import('./pages/AdminVerificationsPage'), 'AdminVerificationsPage'),
        },
        {
          path: 'admin/verification',
          loader: guardedLoader(['admin']),
          lazy: page(() => import('./pages/AdminVerificationPage'), 'AdminVerificationPage'),
        },
        {
          path: 'admin/verifications/:doctorProfileId',
          loader: guardedLoader(['admin']),
          lazy: page(() => import('./pages/AdminVerificationDetailPage'), 'AdminVerificationDetailPage'),
        },
        {
          path: 'admin/disputes',
          loader: guardedLoader(['admin']),
          lazy: page(() => import('./pages/AdminDisputesPage'), 'AdminDisputesPage'),
        },
        {
          path: 'admin/disputes/:disputeId',
          loader: guardedLoader(['admin']),
          lazy: page(() => import('./pages/AdminDisputeDetailPage'), 'AdminDisputeDetailPage'),
        },
        {
          path: 'admin/*',
          loader: guardedLoader(['admin']),
          errorElement: routeError,
          lazy: page(() => import('./pages/AdminDashboardPage'), 'AdminDashboardPage'),
        },

        { path: '*', lazy: page(() => import('./pages/NotFoundPage'), 'NotFoundPage') },
      ],
    },
  ];
}

/** Browser history by default; hash history when VITE_USE_HASH_ROUTER=true
 * (GitHub Pages has no server-side rewrite for deep links — see
 * docs/adr/0001-routing-strategy.md). */
export function createAppRouter(queryClient: QueryClient) {
  const routes = createAppRoutes(queryClient);
  return import.meta.env.VITE_USE_HASH_ROUTER === 'true'
    ? createHashRouter(routes)
    : createBrowserRouter(routes);
}

/** Memory history equivalent for tests and non-browser renderers. */
export function createMemoryAppRouter(queryClient: QueryClient, initialEntries: string[]) {
  return createMemoryRouter(createAppRoutes(queryClient), { initialEntries });
}
