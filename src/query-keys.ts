// Typed query-key factories (issue #122). One module owns every cache key so
// a hook never invents an ad-hoc array and every mutation invalidates a typed
// prefix instead of hoping two strings match.
//
// Conventions (documented in ARCHITECTURE_ESSENTIALS.md → "Query keys &
// cache invalidation"):
//
// - `<resource>.all` is the invalidation root. Deeper, narrower keys are
//   invalidated only when a write provably touches just them (never widen a
//   key "because it's easy" — see the sibling-key rule on the flag keys).
// - Keys for lists the API scopes to a patient profile carry the profileId
//   (the acting-for profile in `useProfileStore`). Switching profile must
//   never surface another profile's cached data.
// - No key may embed a token, expiry, or any other request-scoped value.

import type { HealthSectionKey } from './types/models';

/**
 * Appointments. `today()` is the doctor's live view for the dashboard and
 * queue panel; `list(profileId)` is the patient-facing list that issue #3
 * ("my appointments") will read and issue #2 (booking) will invalidate, so
 * its shape is fixed here now rather than invented twice later.
 */
export const appointmentKeys = {
  all: ['appointments'] as const,
  today: () => ['appointments', 'today'] as const,
  /** The patient's own list: real `GET /appointments/mine`, scoped by the
   *  server from the session — deliberately not profile-scoped here, because
   *  this frontend has no patientProfileId to scope by (documented gap in
   *  `services/appointments-service.ts`). */
  mine: () => ['appointments', 'mine'] as const,
  /** Profile-scoped list, for when a list query takes a profile id (#2/#3). */
  list: (profileId: string) => ['appointments', 'list', profileId] as const,
  detail: (appointmentId: string) => ['appointments', 'detail', appointmentId] as const,
  /** The check-in queue view shown on an appointment page (assumed core#129). */
  queue: (appointmentId: string) => ['appointments', appointmentId, 'queue'] as const,
};

/** The doctor's queue panel: the live list plus the running-delay knob. */
export const queueKeys = {
  all: ['queue'] as const,
  today: () => ['queue', 'today'] as const,
  runningDelay: () => ['queue', 'running-delay'] as const,
};

/**
 * Care threads. The list is profile-scoped; the detail key nests under the
 * same root so invalidating `all` (e.g. after a future thread mutation)
 * covers both.
 */
export const careThreadKeys = {
  all: ['care-threads'] as const,
  list: (profileId: string) => ['care-threads', profileId] as const,
  detail: (threadId: string) => ['care-threads', 'detail', threadId] as const,
};

/**
 * Health profile entries. Writes only ever touch the one section they edit,
 * under the one profile the acting user selected — never `healthKeys.all`.
 */
export const healthKeys = {
  all: ['health'] as const,
  byProfile: (profileId: string) => ['health', profileId] as const,
  section: (profileId: string, section: HealthSectionKey) =>
    ['health', profileId, section] as const,
};

/**
 * Dependents live under `/patients/me`, not a profile route, so they are
 * deliberately *not* profile-scoped: the server keys them to the session.
 */
export const dependentKeys = {
  all: ['dependents'] as const,
};

/** Per-facility admin resources (members, invites, fulfillment queue). */
export const facilityKeys = {
  all: ['facility'] as const,
  members: (facilityId: string) => ['facility', facilityId, 'members'] as const,
  invites: (facilityId: string) => ['facility', facilityId, 'invites'] as const,
  queue: (facilityId: string) => ['facility', facilityId, 'queue'] as const,
};

/** The public facility search — one key per search input (search only, no mutations). */
export const facilitySearchKeys = {
  all: ['facilities'] as const,
  list: (params: { type?: string; lat?: number; lng?: number; query?: string }) =>
    ['facilities', params.type ?? null, params.lat ?? null, params.lng ?? null, params.query ?? null] as const,
};

/** Admin audit tables: one root, one key per tab+filter combination. */
export const auditKeys = {
  all: ['admin', 'audit'] as const,
  page: (tab: string, query: unknown) => ['admin', 'audit', tab, query] as const,
};

/** Stuck-referral queue and the reassignment picker. */
export const referralKeys = {
  all: ['admin', 'referrals'] as const,
  stuck: (olderThan: string) => ['admin', 'referrals', 'stuck', olderThan] as const,
  stuckRoot: () => ['admin', 'referrals', 'stuck'] as const,
  candidatesRoot: () => ['admin', 'referrals', 'candidates'] as const,
  candidates: (specialtyId: string) =>
    ['admin', 'referrals', 'candidates', specialtyId] as const,
};

/** Readiness / jobs / outbox — three sibling views under one root. */
export const systemKeys = {
  all: ['admin', 'system'] as const,
  readiness: () => ['admin', 'system', 'readiness'] as const,
  jobs: () => ['admin', 'system', 'jobs'] as const,
  outbox: () => ['admin', 'system', 'outbox'] as const,
};

/**
 * Feature flags. `list` and `history` stay *siblings* under `all` (the
 * original rule, preserved): invalidating the list must not refetch the
 * audit lookup and vice-versa — only `flagKeys.all` (the write path) hits
 * both.
 */
export const flagKeys = {
  all: ['admin', 'flags'] as const,
  list: () => ['admin', 'flags', 'list'] as const,
  history: () => ['admin', 'flags', 'history'] as const,
};

export const accountKeys = {
  all: ['account'] as const,
  dataExport: () => ['account', 'data-export'] as const,
  /** "Who viewed my records" — account-scoped, cursor-paginated. */
  accessLog: (filters: unknown) => ['account', 'access-log', filters] as const,
};

/**
 * Doctor verification review queue (issue #64). `list` is the pending queue;
 * `detail` nests under the same root so one decision invalidation refreshes
 * both. The per-doctor decision history is read from `auditKeys`, not here —
 * it is the audit trail's data, not a verification resource of its own.
 */
export const verificationKeys = {
  all: ['admin', 'verifications'] as const,
  list: () => ['admin', 'verifications', 'list'] as const,
  detail: (doctorProfileId: string) => ['admin', 'verifications', 'detail', doctorProfileId] as const,
};

/** Escrow intents, the facility payout ledger, and wallet linking. */
export const paymentKeys = {
  all: ['payments'] as const,
  intent: (intentId: string) => ['payments', 'intent', intentId] as const,
  walletLink: () => ['payments', 'wallet-link'] as const,
  /** Root over every facility's ledger: an intent action moves held/released
   *  totals we cannot attribute to a single facility from the intent alone. */
  ledgers: () => ['payments', 'ledger'] as const,
  ledger: (facilityId: string, filters: unknown) =>
    ['payments', 'ledger', facilityId, filters] as const,
  /** The patient's payment history (infinite list + one entry). */
  history: () => ['payments', 'mine'] as const,
  historyEntry: (entryId: string) => ['payments', 'mine', entryId] as const,
  /** The intent attached to an order — `null` when the order has none (issue #61). */
  orderIntent: (orderId: string) => ['payments', 'order', orderId] as const,
};

/** Doctor's abnormal-results inbox (polls every 30 s, acked rows drop off). */
export const resultKeys = {
  all: ['doctor', 'results'] as const,
  pendingAbnormal: () => ['doctor', 'results', 'pending-abnormal'] as const,
};

/** The doctor's subscribable ICS feed (token rotation writes through). */
export const calendarKeys = {
  all: ['doctor', 'calendar'] as const,
  feed: () => ['doctor', 'calendar', 'feed'] as const,
};

/** A patient's chart as the doctor sees it — every sub-resource is keyed by
 *  the charted patient id, so charts never bleed between patients. */
export const patientChartKeys = {
  all: (patientProfileId: string) => ['patient', patientProfileId] as const,
  health: (patientProfileId: string, section: HealthSectionKey) =>
    ['patient', patientProfileId, 'health', section] as const,
  careThread: (patientProfileId: string) =>
    ['patient', patientProfileId, 'care-thread'] as const,
  activeOrders: (patientProfileId: string) =>
    ['patient', patientProfileId, 'active-orders'] as const,
  recentResults: (patientProfileId: string) =>
    ['patient', patientProfileId, 'recent-results'] as const,
};

export const consultationKeys = {
  all: ['consultation'] as const,
  note: (appointmentId: string) => ['consultation', 'note', appointmentId] as const,
};

export const insightKeys = {
  all: ['doctor', 'insights'] as const,
  params: (params: unknown) => ['doctor', 'insights', params] as const,
};

/** In-app notification inbox (issue #107). One list key per page size — the
 * cursor lives in the infinite query, never in the key (a cursor in the key
 * would create a cache entry per page and break invalidation). */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit: number) => ['notifications', 'list', limit] as const,
  streamTicket: () => ['notifications', 'stream-ticket'] as const,
};

export const messageKeys = {
  all: ['doctor', 'messages'] as const,
  threads: (filter: unknown, cursor: unknown, limit: number | undefined) =>
    ['doctor', 'messages', 'threads', filter, cursor, limit] as const,
};
