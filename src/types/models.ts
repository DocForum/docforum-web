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

export type Role = 'patient' | 'doctor' | 'facility' | 'admin';

/** Roles a user may self-register as. Facility accounts are admin-invited
 * only (PRD OQ-2) — there is deliberately no self-serve facility signup. */
export type SelfServeRole = Extract<Role, 'patient' | 'doctor'>;

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string; // assumed — not yet in schema.prisma
  dateOfBirth?: string; // assumed — not yet in schema.prisma
}

export interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string; // assumed — not yet in schema.prisma
  verificationStatus: VerificationStatus;
}

export type FacilityType = 'lab' | 'pharmacy';

export interface FacilityProfile {
  id: string;
  userId: string;
  name: string; // assumed — not yet in schema.prisma
  type: FacilityType;
}

// --- Dependents (Phase W2 — assumed, docforum-core#42 not landed yet) ------

export type Relationship = 'parent' | 'guardian' | 'carer';

export type HandoverStatus = 'not_eligible' | 'eligible' | 'invited' | 'claimed';

export interface Dependent {
  id: string;
  guardianProfileId: string;
  fullName: string;
  dateOfBirth: string;
  relationship: Relationship;
  handoverStatus: HandoverStatus;
  claimEmail?: string;
  claimInviteExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DependentInput {
  fullName: string;
  dateOfBirth: string;
  relationship: Relationship;
}

// --- Health profile (Phase W2 — assumed, docforum-core#59 not landed yet) ---

export type HealthSectionKey = 'allergies' | 'conditions' | 'medications';

export interface HealthEntry {
  id: string;
  patientProfileId: string;
  section: HealthSectionKey;
  name: string;
  details?: string;
  version: number;
  previousValue?: string;
  updatedAt: string;
  createdAt: string;
}

export interface HealthEntryInput {
  section: HealthSectionKey;
  name: string;
  details?: string;
}

// --- Acting-for profile (Phase W2 — client-only UI state + API scoping) ----

export interface ActingProfile {
  id: string;
  fullName: string;
  isSelf: boolean;
}

// --- Payments (Phase 5.5 in docforum-core — real, not assumed. See that
// repo's docs/adr/0004-custodial-payments-v1.md) ---------------------------
// Custodial v1: docforum-core holds its own Stellar identities; this repo
// never calls Stellar/docforum-escrow directly (hard rule 1 above).
// WalletLink is scoped to the facility (the on-chain payee), not a patient.

export interface WalletLink {
  id: string;
  facilityId: string;
  stellarPublicKey: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderTypeForPayment = 'prescription' | 'lab_order';
export type PaymentIntentStatus = 'created' | 'escrowed' | 'released' | 'refunded' | 'failed';

export interface PaymentIntent {
  id: string;
  orderType: OrderTypeForPayment;
  // Opaque — Prescription/LabOrder don't exist as real records in
  // docforum-core yet (Phase 4). Not validated against anything there.
  orderId: string;
  status: PaymentIntentStatus;
  patientProfileId: string;
  facilityId: string;
  // Raw stroops (native XLM's smallest unit), sent/received as a string
  // over JSON — matches docforum-core's BigInt field exactly, no
  // decimal/currency conversion.
  amountStroops: string;
  escrowId: string | null;
  stellarTxHash: string | null;
  sorobanContractId: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Data export (Phase W2, issue #26 — docforum-core#40) -------------------

export type DataExportStatus = 'pending' | 'processing' | 'ready' | 'expired' | 'failed';

export interface DataExport {
  id: string;
  patientProfileId: string;
  status: DataExportStatus;
  requestedAt: string;
  readyAt?: string | null;
  expiresAt?: string | null;
  fileSizeBytes?: number | null;
  downloadUrl?: string | null;
  errorMessage?: string | null;
}

// --- Account deletion (Phase W2, issue #27 — docforum-core#41) ---------------

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deletedAt: string;
}

// --- Care thread timeline (Phase W2, issue #28) ------------------------------

export type CareStepType = 'appointment' | 'consultation' | 'referral' | 'order' | 'fulfillment' | 'payment';
export type CareStepStatus = 'completed' | 'in_progress' | 'action_required' | 'pending' | 'skipped';

export interface CareThreadStep {
  id: string;
  stepType: CareStepType;
  title: string;
  description: string;
  status: CareStepStatus;
  timestamp?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CareThread {
  id: string;
  patientProfileId: string;
  title: string;
  doctorName: string;
  specialty: string;
  startedAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'cancelled';
  steps: CareThreadStep[];
}

// --- Facility finder with location & distance (Phase W2, issue #29) ----------

export interface FacilityLocation {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface FacilityWithDistance extends FacilityProfile {
  location?: FacilityLocation;
  distanceKm?: number | null;
  isOpen?: boolean;
  phone?: string;
  rating?: number;
}

// --- Phase W3 — Doctor core flow (assumed, docforum-core issues #61/#129 not
// landed yet) ---------------------------------------------------------------
// These shapes mirror the smallest contract needed to build the doctor's
// today view, live queue, inbox, and consultation sign-off. Reconcile once
// docforum-core defines them; record any deviation in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions".

export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  doctorProfileId: string;
  patientProfileId: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason?: string | null;
  checkInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface QueueEntry {
  appointmentId: string;
  patientProfileId: string;
  fullName: string;
  checkedInAt: string;
  queuePosition: number;
  status: 'checked_in' | 'in_progress' | 'completed';
}

export interface RunningDelay {
  computedDelayMin: number;
  manualOverrideMin: number | null;
  effectiveDelayMin: number;
}

export interface UpdateRunningDelayInput {
  manualOverrideMin: number | null;
}

export interface MessageThread {
  id: string;
  patientProfileId: string;
  patientName: string;
  lastMessageAt: string;
  unreadCount: number;
  lastPreview?: string | null;
  waitingMinutes?: number | null;
  closingSoon?: boolean;
}

export type ThreadFilter = 'all' | 'unread' | 'closing_soon';

export interface ConsultationNote {
  id: string;
  appointmentId: string;
  content: string;
  signedAt?: string | null;
  signedBy?: string | null;
  autoSignOffAt?: string | null;
  addenda: ConsultationAddendum[];
}

export interface ConsultationAddendum {
  id: string;
  noteId: string;
  content: string;
  createdAt: string;
}

export interface AddAddendumInput {
  content: string;
}

// --- Phase W3 — Doctor Practice Insights (issue #50, depends on docforum-core#124) ---

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;   // ISO date YYYY-MM-DD
}

export interface UtilisationWeek {
  weekLabel: string;
  startDate: string;
  endDate: string;
  offeredSlots: number;
  bookedSlots: number;
  completedSlots: number;
  utilisationRate: number; // percentage 0-100
}

export interface NoShowMetrics {
  totalScheduled: number;
  completedVisits: number;
  noShows: number;
  lateCancellations: number;
  onTimeCancellations: number;
  noShowRate: number;        // percentage
  lateCancelRate: number;    // percentage
  sampleSizeWarning: boolean;
}

export interface ReferralTurnaroundMetrics {
  totalSent: number;
  totalAccepted: number;
  totalPending: number;
  averageAcceptanceHours: number;
  medianAcceptanceHours: number;
  breakdownUnder24h: number;
  breakdown24to48h: number;
  breakdownOver48h: number;
  sampleSizeWarning: boolean;
}

export interface MessageResponseMetrics {
  totalThreads: number;
  averageFirstResponseMinutes: number;
  medianFirstResponseMinutes: number;
  respondedWithin2hCount: number;
  respondedWithin24hCount: number;
  rateWithin2h: number;
  sampleSizeWarning: boolean;
}

export interface DoctorPracticeInsights {
  doctorProfileId: string;
  range: DateRange;
  generatedAt: string;
  utilisation: {
    weeks: UtilisationWeek[];
    overallOfferedSlots: number;
    overallBookedSlots: number;
    overallUtilisationRate: number;
    sampleSizeWarning: boolean;
  };
  noShows: NoShowMetrics;
  referrals: ReferralTurnaroundMetrics;
  messages: MessageResponseMetrics;
}

// --- Phase W4 — Facility Staff Accounts & Fulfillment Attribution (issue #51, docforum-core#75) ---

export type FacilityMemberRole = 'owner' | 'staff';

export interface FacilityMember {
  id: string;
  facilityId: string;
  userId: string;
  fullName: string;
  email: string;
  role: FacilityMemberRole;
  joinedAt: string;
  isCurrentUser?: boolean;
}

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface FacilityInvite {
  id: string;
  facilityId: string;
  email: string;
  role: FacilityMemberRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: InviteStatus;
}

export interface InviteMemberInput {
  email: string;
  role: FacilityMemberRole;
}

export interface RemoveMemberResponse {
  success: boolean;
  memberId: string;
  sessionsRevoked: boolean;
  message: string;
}

export type FulfillmentOrderType = 'prescription' | 'lab';
export type FulfillmentItemStatus = 'pending' | 'in_progress' | 'fulfilled' | 'rejected';

export interface FulfillmentActionAttribution {
  action: 'dispensed' | 'sample_collected' | 'verified' | 'rejected';
  performedByUserId: string;
  performedByName: string;
  performedByEmail: string;
  performedByRole: FacilityMemberRole;
  timestamp: string;
  notes?: string | null;
}

export interface FulfillmentQueueItem {
  id: string;
  facilityId: string;
  orderId: string;
  orderType: FulfillmentOrderType;
  patientName: string;
  patientProfileId: string;
  itemName: string;
  instructions?: string | null;
  status: FulfillmentItemStatus;
  receivedAt: string;
  attribution?: FulfillmentActionAttribution | null;
}

// --- Phase W4 — Scan-to-verify orders (issue #52, docforum-core#71) ---

export type OrderVerificationStatus =
  | 'valid'
  | 'superseded'
  | 'expired'
  | 'fulfilled'
  | 'not_eligible';

export interface VerifiedOrderSummary {
  orderId: string;
  orderType: FulfillmentOrderType;
  patientName: string;
  medicationOrTest: string;
  instructions?: string | null;
  issuedAt: string;
  expiresAt: string;
  supersededBy?: string | null;
  fulfilledAt?: string | null;
  fulfilledByFacility?: string | null;
}

export interface VerifyOrderResponse {
  status: OrderVerificationStatus;
  token: string;
  verifiedAt: string;
  message?: string;
  order?: VerifiedOrderSummary | null;
}

// --- Phase W4 — Facility Payout Ledger (issue #53, docforum-core#90) ---

export type EscrowPayoutStatus = 'held' | 'released' | 'refunded';
export type PayoutAsset = 'XLM' | 'USDC';

export interface EscrowTerms {
  releaser: 'patient' | 'auto_dispense' | 'platform';
  releaserDescription: string;
  refundDeadline: string; // ISO timestamp
  isApproachingDeadline: boolean; // within 48h
  hoursUntilRefund: number;
}

export interface FacilityLedgerEntry {
  id: string;
  facilityId: string;
  orderId: string;
  orderType: FulfillmentOrderType;
  orderItemName: string;
  patientName: string;
  amountStroops: string; // BigInt-safe string representation
  asset: PayoutAsset;
  status: EscrowPayoutStatus;
  escrowId: string;
  contractId?: string | null;
  fundTxHash: string;
  releaseTxHash?: string | null;
  refundTxHash?: string | null;
  terms: EscrowTerms;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTotals {
  heldStroops: string;
  releasedStroops: string;
  refundedStroops: string;
}

export interface FacilityPayoutTotals {
  xlm: AssetTotals;
  usdc: AssetTotals;
}

export interface FacilityLedgerPage {
  entries: FacilityLedgerEntry[];
  nextCursor?: string | null;
  totals: FacilityPayoutTotals;
}

