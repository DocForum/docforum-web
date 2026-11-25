import type { Role } from '../types/models';

/**
 * Route metadata for breadcrumbs and auto page titles (issue #234).
 *
 * The app used to build breadcrumbs — and page titles — from raw URL
 * segments, so `/doctor/consultation/apt-1` produced a link to the
 * non-existent `/doctor/consultation` and a crumb labelled "Apt 1".
 *
 * This table is the single place that knows a route's human label and its
 * parent. Only patterns listed here get a linked crumb, so a breadcrumb can
 * never point at a path that has no route. Dynamic segments are matched but
 * never rendered: the current crumb always uses the page's own title.
 *
 * Patient nested routes live in `PatientDashboardPage`, so they are listed
 * here explicitly rather than derived from the router.
 */
export interface BreadcrumbRoute {
  /** Path pattern; `:param` matches one non-empty segment. */
  pattern: string;
  /** English fallback label. */
  label: string;
  /** Catalogue id for the label. */
  messageId: string;
  /** Pattern of the parent route, when it has one. */
  parent?: string;
  /** Roles the route belongs to, for documentation/tests only. */
  roles?: Role[];
}

export interface Breadcrumb {
  label: string;
  messageId?: string;
  to?: string;
}

/** Most specific patterns first; `matchRoute` also scores static segments. */
export const BREADCRUMB_ROUTES: BreadcrumbRoute[] = [
  { pattern: '', label: 'Home', messageId: 'breadcrumb.home' },

  // Account & shared
  { pattern: 'login', label: 'Log in', messageId: 'breadcrumb.logIn' },
  { pattern: 'signup', label: 'Sign up', messageId: 'breadcrumb.signUp' },
  { pattern: 'claim-account', label: 'Claim account', messageId: 'breadcrumb.claimAccount' },
  { pattern: 'invite', label: 'Accept invitation', messageId: 'breadcrumb.invite' },
  { pattern: 'account-deleted', label: 'Account deleted', messageId: 'breadcrumb.accountDeleted' },
  { pattern: 'privacy/analytics', label: 'Privacy & analytics', messageId: 'breadcrumb.privacyAnalytics' },
  { pattern: 'notifications', label: 'Notifications', messageId: 'breadcrumb.notifications' },
  {
    pattern: 'settings/notifications',
    label: 'Notification settings',
    messageId: 'breadcrumb.notificationSettings',
    parent: 'notifications',
  },
  { pattern: 'payments', label: 'Payments', messageId: 'breadcrumb.payments', roles: ['patient'] },
  {
    pattern: 'payments/:intentId',
    label: 'Payment details',
    messageId: 'breadcrumb.paymentDetails',
    parent: 'payments',
    roles: ['patient'],
  },
  {
    pattern: 'account/access-log',
    label: 'Who viewed my records',
    messageId: 'breadcrumb.accessLog',
    roles: ['patient'],
  },
  { pattern: 'care', label: 'Care journey', messageId: 'breadcrumb.careJourney', roles: ['patient', 'doctor'] },
  {
    pattern: 'care/:threadId',
    label: 'Care thread',
    messageId: 'breadcrumb.careThread',
    parent: 'care',
    roles: ['patient', 'doctor'],
  },
  {
    pattern: 'care/threads/:threadId',
    label: 'Care thread',
    messageId: 'breadcrumb.careThread',
    parent: 'care',
    roles: ['patient', 'doctor'],
  },
  {
    pattern: 'appointments/:id',
    label: 'Appointment',
    messageId: 'breadcrumb.appointment',
    roles: ['patient'],
  },
  {
    pattern: 'doctors/:doctorId',
    label: 'Doctor profile',
    messageId: 'breadcrumb.doctorProfile',
    roles: ['patient'],
  },

  // Patient
  { pattern: 'patient', label: 'Patient dashboard', messageId: 'breadcrumb.patientDashboard', roles: ['patient'] },
  {
    pattern: 'patient/search',
    label: 'Find a doctor',
    messageId: 'breadcrumb.findADoctor',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/doctors',
    label: 'Doctor directory',
    messageId: 'breadcrumb.doctorDirectory',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/book',
    label: 'Book appointment',
    messageId: 'breadcrumb.bookAppointment',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/appointments',
    label: 'Appointments',
    messageId: 'breadcrumb.appointments',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/referrals',
    label: 'My referrals',
    messageId: 'breadcrumb.myReferrals',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/waitlist',
    label: 'Waitlist',
    messageId: 'breadcrumb.waitlist',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/orders',
    label: 'My orders',
    messageId: 'breadcrumb.orders',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/orders/:orderId',
    label: 'Order details',
    messageId: 'breadcrumb.orderDetails',
    parent: 'patient/orders',
    roles: ['patient'],
  },
  {
    pattern: 'patient/results',
    label: 'Lab results',
    messageId: 'breadcrumb.labResults',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/results/:resultId',
    label: 'Lab result details',
    messageId: 'breadcrumb.labResultDetails',
    parent: 'patient/results',
    roles: ['patient'],
  },
  {
    pattern: 'patient/dependents',
    label: 'Dependents',
    messageId: 'breadcrumb.dependents',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/health',
    label: 'Health profile',
    messageId: 'breadcrumb.healthProfile',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/facilities',
    label: 'Find pharmacies & labs',
    messageId: 'breadcrumb.facilities',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/settings',
    label: 'Account settings & privacy',
    messageId: 'breadcrumb.accountSettings',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/messages/:threadId',
    label: 'Message thread',
    messageId: 'breadcrumb.messageThread',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/appointments/:appointmentId',
    label: 'Appointment',
    messageId: 'breadcrumb.appointment',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/appointments/:appointmentId/intake',
    label: 'Intake form',
    messageId: 'breadcrumb.intakeForm',
    parent: 'patient',
    roles: ['patient'],
  },
  // The patient console's own copy of the care timeline. It gets its own label
  // so its tab title differs from /care, which is the same screen reached from
  // the main navigation (#237).
  {
    pattern: 'patient/care',
    label: 'Care timeline',
    messageId: 'breadcrumb.careTimeline',
    parent: 'patient',
    roles: ['patient'],
  },
  {
    pattern: 'patient/care/*',
    label: 'Care timeline',
    messageId: 'breadcrumb.careTimeline',
    parent: 'patient',
    roles: ['patient'],
  },

  // Doctor
  { pattern: 'doctor', label: 'Doctor dashboard', messageId: 'breadcrumb.doctorDashboard', roles: ['doctor'] },
  {
    pattern: 'doctor/messages',
    label: 'Messages',
    messageId: 'breadcrumb.messages',
    parent: 'doctor',
    roles: ['doctor'],
  },
  {
    pattern: 'doctor/messages/:threadId',
    label: 'Message thread',
    messageId: 'breadcrumb.messageThread',
    parent: 'doctor/messages',
    roles: ['doctor'],
  },
  {
    pattern: 'doctor/insights',
    label: 'Practice insights',
    messageId: 'breadcrumb.practiceInsights',
    parent: 'doctor',
    roles: ['doctor'],
  },
  {
    pattern: 'doctor/consultation/:appointmentId',
    label: 'Consultation note',
    messageId: 'breadcrumb.consultationNote',
    parent: 'doctor',
    roles: ['doctor'],
  },
  {
    pattern: 'doctor/patient-chart/:patientProfileId',
    label: 'Patient chart',
    messageId: 'breadcrumb.patientChart',
    parent: 'doctor',
    roles: ['doctor'],
  },
  {
    pattern: 'doctor/verification',
    label: 'Doctor verification',
    messageId: 'breadcrumb.doctorVerification',
    parent: 'doctor',
    roles: ['doctor'],
  },

  // Facility
  { pattern: 'facility', label: 'Facility dashboard', messageId: 'breadcrumb.facilityDashboard', roles: ['facility'] },
  {
    pattern: 'facility/verify',
    label: 'Verify order',
    messageId: 'breadcrumb.verifyOrder',
    parent: 'facility',
    roles: ['facility'],
  },
  {
    pattern: 'facility/payments',
    label: 'Payouts',
    messageId: 'breadcrumb.payouts',
    parent: 'facility',
    roles: ['facility'],
  },
  {
    pattern: 'facility/team',
    label: 'Team',
    messageId: 'breadcrumb.team',
    parent: 'facility',
    roles: ['facility'],
  },
  {
    pattern: 'facility/integrations',
    label: 'Integrations',
    messageId: 'breadcrumb.integrations',
    parent: 'facility',
    roles: ['facility'],
  },
  {
    pattern: 'facility/insights',
    label: 'Insights',
    messageId: 'breadcrumb.insights',
    parent: 'facility',
    roles: ['facility'],
  },
  {
    pattern: 'facility/settings',
    label: 'Settings',
    messageId: 'breadcrumb.settings',
    parent: 'facility',
    roles: ['facility'],
  },

  // Admin
  { pattern: 'admin', label: 'Admin dashboard', messageId: 'breadcrumb.adminDashboard', roles: ['admin'] },
  {
    pattern: 'admin/users',
    label: 'Users',
    messageId: 'breadcrumb.users',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/payments/console',
    label: 'Payments console',
    messageId: 'breadcrumb.paymentsConsole',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/audit',
    label: 'Audit log',
    messageId: 'breadcrumb.auditTrail',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/referrals',
    label: 'Referrals',
    messageId: 'breadcrumb.referrals',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/verifications',
    label: 'Verifications',
    messageId: 'breadcrumb.verifications',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/verifications/:doctorProfileId',
    label: 'Verification details',
    messageId: 'breadcrumb.verificationDetails',
    parent: 'admin/verifications',
    roles: ['admin'],
  },
  {
    pattern: 'admin/verification',
    label: 'Specialty claims review',
    messageId: 'breadcrumb.specialtyClaims',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/disputes',
    label: 'Disputes',
    messageId: 'breadcrumb.disputes',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/disputes/:disputeId',
    label: 'Dispute details',
    messageId: 'breadcrumb.disputeDetails',
    parent: 'admin/disputes',
    roles: ['admin'],
  },
  {
    pattern: 'admin/system',
    label: 'System',
    messageId: 'breadcrumb.system',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/flags',
    label: 'Flags',
    messageId: 'breadcrumb.flags',
    parent: 'admin',
    roles: ['admin'],
  },
  {
    pattern: 'admin/catalogs',
    label: 'Catalogs',
    messageId: 'breadcrumb.catalogs',
    parent: 'admin',
    roles: ['admin'],
  },
];

const ROUTES_BY_PATTERN = new Map(BREADCRUMB_ROUTES.map((route) => [route.pattern, route]));

function segmentMatches(patternSegment: string, pathSegment: string): boolean {
  if (patternSegment === '*') return true;
  if (patternSegment.startsWith(':')) return pathSegment.length > 0;
  return patternSegment === pathSegment;
}

function patternMatches(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return false;
  return patternSegments.every((segment, index) => segmentMatches(segment, pathSegments[index]));
}

/** More static segments and longer patterns are more specific. */
function specificity(pattern: string): number {
  const segments = pattern.split('/').filter(Boolean);
  return segments.filter((segment) => !segment.startsWith(':') && segment !== '*').length * 10 + segments.length;
}

/** Find the metadata entry for a concrete path, or null when unregistered. */
export function matchRoute(pathname: string): BreadcrumbRoute | null {
  let best: BreadcrumbRoute | null = null;
  for (const route of BREADCRUMB_ROUTES) {
    if (!patternMatches(route.pattern, pathname)) continue;
    if (!best || specificity(route.pattern) > specificity(best.pattern)) best = route;
  }
  return best;
}

/**
 * Build a safe breadcrumb trail for `pathname`.
 *
 * - `title` is the page's own title and is used for the current crumb.
 * - Ancestors come from the metadata table and are only linked because the
 *   table lists their pattern; Home is the only fallback link.
 * - An unregistered path yields Home (when not already there) + the title,
 *   with no invented links and no raw ids.
 */
export function buildBreadcrumbs(pathname: string, title: string): Breadcrumb[] {
  if (pathname === '/' || pathname === '') {
    return [{ label: 'Home', messageId: 'breadcrumb.home' }];
  }

  const crumbs: Breadcrumb[] = [{ label: 'Home', messageId: 'breadcrumb.home', to: '/' }];
  const route = matchRoute(pathname);

  if (!route) {
    crumbs.push({ label: title });
    return crumbs;
  }

  const chain: BreadcrumbRoute[] = [];
  let current: BreadcrumbRoute | undefined = route;
  while (current) {
    chain.unshift(current);
    current = current.parent ? ROUTES_BY_PATTERN.get(current.parent) : undefined;
  }

  for (const item of chain) {
    if (item === route) {
      crumbs.push({ label: title });
      continue;
    }
    // Parent patterns are static in this table, so the path is safe to link.
    crumbs.push({ label: item.label, messageId: item.messageId, to: `/${item.pattern}` });
  }

  return crumbs;
}

/** Page title for a route, using the metadata label instead of a raw id. */
export function pageTitleForPath(pathname: string): { label: string; messageId?: string } {
  if (pathname === '/' || pathname === '') {
    return { label: 'Home', messageId: 'breadcrumb.home' };
  }
  const route = matchRoute(pathname);
  if (route) return { label: route.label, messageId: route.messageId };

  const last = pathname.split('/').filter(Boolean).pop() ?? 'Home';
  const label = last
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/Id\b/g, 'ID')
    .replace(/Url\b/g, 'URL');
  return { label };
}
