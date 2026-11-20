// Frontend-side TypeScript types mirroring backend/prisma/schema.prisma in
// docforum-core. Keep in sync — see AGENTS.md doc-update table and hard
// rule 2 in ARCHITECTURE_ESSENTIALS.md ("don't invent parallel
// frontend-only shapes for the same entities").
//
// docforum-core's schema is still field-sparse (Phase 1 not started there
// — see its ROADMAP.md). Fields below marked "assumed" don't exist in
// schema.prisma yet; they're the smallest reasonable guess needed to build
// a signup form, not a confirmed contract. Reconcile this file once
// docforum-core actually defines them.
//
// The types live in ./models/, one file per feature (same sections this file
// used to have). Import from here as before; add new types to the feature's
// file, or a new file plus one line below (alphabetical).

export type * from './models/acting-for-profile';
export type * from './models/active-sessions';
export type * from './models/admin-audit';
export type * from './models/affected-appointments';
export type * from './models/appointments';
export type * from './models/care-thread-timeline';
export type * from './models/catalogs';
export type * from './models/closure-calendar';
export type * from './models/confirm-receipt';
export type * from './models/core';
export type * from './models/data-export';
export type * from './models/dependents';
export type * from './models/doctor-core-flow';
export type * from './models/doctor-practice-insights';
export type * from './models/doctor-search';
export type * from './models/doctor-verification';
export type * from './models/doctor-verification-queue';
export type * from './models/evaluated-feature-flags';
export type * from './models/facility-finder';
export type * from './models/facility-integrations';
export type * from './models/facility-payout-ledger';
export type * from './models/facility-performance-insights';
export type * from './models/facility-settings';
export type * from './models/facility-staff';
export type * from './models/feature-flags-console';
export type * from './models/first-run-onboarding';
export type * from './models/fulfilment-disputes';
export type * from './models/health-profile';
export type * from './models/intake';
export type * from './models/invitation-redemption';
export type * from './models/live-visit-queue';
export type * from './models/messaging';
export type * from './models/notification-centre';
export type * from './models/notification-preferences';
export type * from './models/orders';
export type * from './models/partial-fulfilment';
export type * from './models/patient-appointment-view';
export type * from './models/patient-orders';
export type * from './models/patient-referrals';
export type * from './models/pay-with-wallet';
export type * from './models/payment-history';
export type * from './models/payments';
export type * from './models/phi-access-log';
export type * from './models/prescription-source';
export type * from './models/referral-inbox';
export type * from './models/scan-to-verify-orders';
export type * from './models/session-idle-timeout';
export type * from './models/specialty-verification-review';
export type * from './models/stuck-referrals';
export type * from './models/system-health';
export type * from './models/typed-client-aliases';
export type * from './models/waitlist';
