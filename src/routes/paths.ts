/**
 * The single route table (issue #300).
 *
 * Every path in the app is defined here once. Route definitions
 * (`src/routes/*.tsx`), navigation (`src/navigation/*`), notification
 * destinations, the command palette and page links build their targets through
 * these entries, so renaming or deleting a route fails `npm run typecheck` at
 * every consumer instead of shipping a dead link.
 *
 * Builders return router paths (no origin, no HashRouter `#`), so they work
 * unchanged under both HashRouter and BrowserRouter.
 */

/** Segments of the nested patient hub (`/patient/*`, rendered by
 * `PatientDashboardPage`). Nested `<Route path>` values must stay relative —
 * React Router joins them with the parent's `patient/*` pattern — so the hub
 * imports this object for its route paths and relative links, while the
 * absolute `paths.patient.*` entries below are for everywhere else. */
export const patientSections = {
  search: 'search',
  orders: 'orders',
  order: 'orders/:orderId',
  dependents: 'dependents',
  referrals: 'referrals',
  waitlist: 'waitlist',
  health: 'health',
  facilities: 'facilities',
  messages: 'messages/:threadId',
  settings: 'settings',
  care: 'care/*',
  appointment: 'appointments/:appointmentId',
  intake: 'appointments/:appointmentId/intake',
} as const;

const patient = (section: string) => `/patient/${section}`;

export const paths = {
  // Public pages and shared signed-in routes.
  home: '/',
  login: '/login',
  signup: '/signup',
  accountSecurity: '/account/security',
  claimAccount: '/claim-account',
  invite: '/invite',
  accountDeleted: '/account-deleted',
  notifications: '/notifications',
  notificationSettings: '/settings/notifications',
  privacyAnalytics: '/privacy/analytics',
  howItWorks: '/how-it-works',
  forDoctors: '/for-doctors',
  forFacilities: '/for-facilities',
  privacy: '/privacy',
  accessibility: '/accessibility',
  faq: '/faq',

  // Patient.
  accessLog: '/account/access-log',
  payments: '/payments',
  payment: (intentId: string) => `/payments/${intentId}`,
  care: '/care',
  careThread: (threadId: string) => `/care/${threadId}`,
  /** Older deep links use `/care/threads/:threadId`; kept routed (#34). */
  legacyCareThread: (threadId: string) => `/care/threads/${threadId}`,
  appointment: (id: string) => `/appointments/${id}`,
  patient: {
    root: '/patient',
    search: patient(patientSections.search),
    orders: patient(patientSections.orders),
    order: (orderId: string) => patient(`orders/${orderId}`),
    dependents: patient(patientSections.dependents),
    referrals: patient(patientSections.referrals),
    waitlist: patient(patientSections.waitlist),
    health: patient(patientSections.health),
    facilities: patient(patientSections.facilities),
    messages: (threadId: string) => patient(`messages/${threadId}`),
    settings: patient(patientSections.settings),
    care: patient('care'),
    appointment: (appointmentId: string) =>
      patient(`appointments/${appointmentId}`),
    intake: (appointmentId: string) =>
      patient(`appointments/${appointmentId}/intake`),
  },

  // Doctor.
  doctor: {
    root: '/doctor',
    insights: '/doctor/insights',
    /** A consultation always belongs to an appointment; there is no
     * id-less `/doctor/consultation/new` route. */
    consultation: (appointmentId: string) =>
      `/doctor/consultation/${appointmentId}`,
    messages: '/doctor/messages',
    message: (threadId: string) => `/doctor/messages/${threadId}`,
    patientChart: (patientProfileId: string) =>
      `/doctor/patient-chart/${patientProfileId}`,
  },

  // Facility.
  facility: {
    root: '/facility',
    verify: '/facility/verify',
    payments: '/facility/payments',
    team: '/facility/team',
    integrations: '/facility/integrations',
    insights: '/facility/insights',
    settings: '/facility/settings',
  },

  // Admin.
  admin: {
    root: '/admin',
    audit: '/admin/audit',
    referrals: '/admin/referrals',
    verifications: '/admin/verifications',
    verification: '/admin/verification',
    verificationDoctor: (doctorProfileId: string) =>
      `/admin/verifications/${doctorProfileId}`,
    disputes: '/admin/disputes',
    dispute: (disputeId: string) => `/admin/disputes/${disputeId}`,
    system: '/admin/system',
    flags: '/admin/flags',
    catalogs: '/admin/catalogs',
  },
} as const;
