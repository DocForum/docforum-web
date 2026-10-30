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

// --- Session idle timeout (issue #82) — ASSUMED, not yet in docforum-core --
// Shared clinical devices: the backend is expected to be able to push its
// own per-role idle timeout, which takes precedence over the frontend
// defaults. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Session
// idle timeout".

export interface SessionTimeoutSettings {
  /** Idle minutes before the session is signed out. */
  idleTimeoutMinutes: number;
  /** Seconds of warning shown before the sign-out. */
  warningSeconds: number;
}

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

// --- Orders (Phase W2 in docforum-web, assumed contract against
// docforum-core issue #71 / PRD §8.1.6 — see ARCHITECTURE_ESSENTIALS.md
// "Known assumptions". Endpoints and field names are provisional until
// docforum-core's order-token implementation lands.) -------------------

/** Type of clinical order a doctor can issue. */
export type OrderType = 'prescription' | 'lab_order';

/** Order validity state as reported by docforum-core.
 * - active:      Current, valid — show the scannable QR.
 * - superseded:  A newer order replaced this one — hide the QR, explain.
 * - expired:     Time-limited token has passed its validity window.
 * - fulfilled:   Facility marked the order completed.
 * - cancelled:   Order was cancelled by doctor or patient.
 */
export type OrderStatus = 'active' | 'superseded' | 'expired' | 'fulfilled' | 'cancelled';

/** An individual line item on a lab order or prescription. */
export interface OrderItem {
  /** Human-readable name (e.g. "FBC" or "Amoxicillin 250mg"). */
  name: string;
  /** Directions or instructions (optional). */
  note?: string;
}

/** Full detail of a patient order, as returned by docforum-core's
 * `GET /orders/:id` endpoint. The `token` field is the opaque signed
 * string that encodes into the QR code — never include order details
 * in the QR, only the token itself (issue #25 constraint). */
export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  /** The signed, opaque token that facilities scan. Absent/null for
   * non-active orders (superseded, expired) — the QR must not be shown
   * when token is null. */
  token: string | null;
  items: OrderItem[];
  /** ISO 8601 timestamp of when the order was issued. */
  issuedAt: string;
  /** ISO 8601 expiry timestamp (null if the order has no time limit). */
  expiresAt: string | null;
  /** The doctor who issued the order. */
  doctorName: string; // assumed — not yet in schema.prisma
  /** The facility the patient chose (null if not yet assigned). */
  facilityName: string | null; // assumed — not yet in schema.prisma
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
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
export type PaymentIntentStatus =
  | 'created'
  // docforum-core#80 (prepare) moves an intent here while it waits for the
  // patient's wallet signature; status value assumed until that issue lands.
  | 'awaiting_signature'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'failed';

// `PatientOrder` (= Prescription | LabOrder) is defined with the orders
// work (Phase W2, issue #5) — the order detail page (issue #61) reuses
// that shape as-is.

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

// --- Patient orders and facility selection (Phase W2, issue #5) -------------

export type OrderLifecycleStatus = 'active' | 'completed' | 'cancelled' | 'superseded';

export interface OrderFacilitySummary {
  id: string;
  name: string;
  type: FacilityType;
  isOpen?: boolean;
}

interface OrderVersionBase {
  id: string;
  patientProfileId: string;
  version: number;
  supersedesId: string | null;
  status: OrderLifecycleStatus;
  issuedAt: string;
  issuedByDoctorName?: string | null;
  requiresFacilitySelection: boolean;
  selectedFacility?: OrderFacilitySummary | null;
  // --- Partial fulfilment (issue #54, docforum-core#73 assumed) -----------
  // Optional so main's W2 order screens keep compiling; the partial-fulfilment
  // screens in `features/orders` read these.
  patientName?: string;
  medicationOrTest?: string;
  expiresAt?: string;
  facilityId?: string | null;
  facilityName?: string | null;
  fulfillmentStatus?: PartialFulfillmentStatus;
  items?: OrderItemFulfillment[];
  payment?: OrderPaymentSummary;
}

export interface Prescription extends OrderVersionBase {
  orderType: 'prescription';
  medication: string;
  dose: string;
  quantity?: string | null;
  instructions?: string | null;
}

// --- Prescription source (Phase W2 — assumed, docforum-core#9 not landed) ---
// The medication schedule reads `GET /patients/:id/prescriptions`, whose
// assumed shape predates the orders contract above (`version`/`issuedAt`
// vs `items`/`createdAt`). It gets its own name rather than widening the
// orders `Prescription` with fields that endpoint never returns.

export type PrescriptionStatus = 'issued' | 'fulfilled' | 'expired' | 'superseded';

/** Mirrors core's Phase 0 `PrescriptionItem` placeholders (`drugName`,
 * `dosage`, `frequency`, `duration` are all free-text Strings there —
 * which is exactly why schedule derivation must degrade to showing them
 * as-is rather than guessing). */
export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  /** Free text, e.g. 'every 8 hours', 'twice daily', 'as needed'. */
  frequency: string;
  /** Free text, e.g. '7 days', '2 weeks', 'ongoing'. */
  duration: string;
}

export interface MedicationPrescription {
  id: string;
  status: PrescriptionStatus;
  createdAt: string;
  // Assumed relation fields — core's Prescription is `{id, status, createdAt}`
  // with these still TODO.
  patientProfileId: string;
  prescribingDoctorId: string;
  prescribingDoctorName?: string;
  items: PrescriptionItem[];
}

export interface LabOrder extends OrderVersionBase {
  orderType: 'lab_order';
  testName: string;
  fastingRequired?: boolean | null;
  instructions?: string | null;
}

export type PatientOrder = Prescription | LabOrder;

export interface QualifiedOrderFacility extends FacilityProfile {
  location?: FacilityLocation;
  isOpen: boolean;
  capabilities: string[];
}

export interface SelectOrderFacilityInput {
  facilityId: string;
  expectedVersion: number;
}

// --- Phase W4 — Facility settings & price lists (issue #56) -----------------
// Assumed contracts pending docforum-core#74 (facility location) and
// docforum-core#127 (versioned facility price lists). See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W4".

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface FacilityOpeningHours {
  day: Weekday;
  closed: boolean;
  /** 24-hour `HH:mm`, or null when the facility is closed that day. */
  opensAt: string | null;
  closesAt: string | null;
}

export interface FacilitySettings {
  facilityId: string;
  name: string;
  type: FacilityType;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string | null;
  openingHours: FacilityOpeningHours[];
  updatedAt: string;
}

export interface FacilitySettingsInput {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string | null;
  openingHours: FacilityOpeningHours[];
}

export interface CatalogItem {
  /** Stable catalog code stored on a FacilityPrice. */
  code: string;
  name: string;
  type: FacilityType;
  description?: string | null;
}

/** One immutable version of a facility price. The row effective latest on or
 * before now is the current price; future rows are scheduled changes. */
export interface FacilityPrice {
  id: string;
  facilityId: string;
  catalogItemCode: string;
  catalogItemName: string;
  asset: PayoutAsset;
  /** BigInt-safe raw stroops — 1 XLM/USDC = 10,000,000 stroops. */
  amountStroops: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface FacilityPriceInput {
  catalogItemCode: string;
  asset: PayoutAsset;
  amountStroops: string;
  effectiveFrom: string;
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

export interface IntakeForm {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  submittedAt: string;
  chiefComplaint: string;
  symptomDuration?: string | null;
  severity?: number | null;
  currentMedications: string[];
  allergies: string[];
  notes?: string | null;
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

export interface DoctorMessageThread {
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

export type ConsultationOutcome = 'resolved' | 'referred' | 'follow_up_needed';

export interface ConsultationRecord {
  id: string;
  appointmentId: string;
  notes: string;
  outcome: ConsultationOutcome;
  followUpAfterDays?: number | null;
  recordedAt: string;
}

export interface RecordConsultationInput {
  notes: string;
  outcome: ConsultationOutcome;
  followUpAfterDays?: number | null;
}

export interface ConsultationReferral {
  id: string;
  consultationId: string;
  targetSpecialty: string;
  reason: string;
  status: ReferralStatus;
  createdAt: string;
}

export interface CreateConsultationReferralInput {
  targetSpecialty: string;
  reason: string;
}

export interface ConsultationPrescriptionInput {
  orderType: 'prescription';
  medication: string;
  dose: string;
  instructions?: string | null;
}

export interface ConsultationLabOrderInput {
  orderType: 'lab_order';
  testName: string;
  instructions?: string | null;
}

export type ConsultationOrderInput = ConsultationPrescriptionInput | ConsultationLabOrderInput;

export interface ConsultationIssuedOrder {
  id: string;
  consultationId: string;
  orderType: ConsultationOrderInput['orderType'];
  medicationOrTest: string;
  instructions?: string | null;
  issuedAt: string;
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
export type FulfillmentItemStatus =
  | 'pending'
  | 'in_progress'
  | 'partially_dispensed'
  | 'fulfilled'
  | 'dispensed_elsewhere'
  | 'rejected';

export interface FulfillmentActionAttribution {
  action: 'dispensed' | 'sample_collected' | 'verified' | 'rejected';
  performedByUserId: string;
  performedByName: string;
  performedByEmail: string;
  performedByRole: FacilityMemberRole;
  timestamp: string;
  notes?: string | null;
}

export interface FulfillmentLabResult {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByUserId: string;
  storageKey?: string | null;
  downloadUrl?: string | null;
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
  /** Links this facility queue row to the patient's order item. */
  orderItemId?: string;
  status: FulfillmentItemStatus;
  receivedAt: string;
  attribution?: FulfillmentActionAttribution | null;
  labResult?: FulfillmentLabResult | null;
  // --- Partial fulfilment (issue #54, docforum-core#73 assumed) -----------
  quantityPrescribed?: number;
  quantityDispensed?: number;
  quantityOutstanding?: number;
  unit?: string;
  canDispense?: boolean;
  blockedReason?: string | null;
  dispensedByFacilityId?: string | null;
  dispensedByFacilityName?: string | null;
}

// --- Phase W4 — Partial fulfilment (issue #54, depends on
// docforum-core#73) ---------------------------------------------------------
// Assumed contract: order-level status is derived from item-level rows.
// The exact payment-release rule is backend-owned and pending #73; the UI
// renders `payment.rule` rather than computing/guessing a release amount.

export type PartialFulfillmentStatus =
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'rejected';

export type OrderItemFulfillmentStatus =
  | 'pending'
  | 'partially_dispensed'
  | 'dispensed'
  | 'dispensed_elsewhere'
  | 'rejected';

/** Item-level fulfilment row for a patient order (issue #54). Named
 * `OrderItemFulfillment` rather than `OrderItem` so it doesn't collide with
 * `OrderItem` above, which is the plain line item on main's `Order`. */
export interface OrderItemFulfillment {
  id: string;
  orderId: string;
  name: string;
  instructions?: string | null;
  quantityPrescribed: number;
  quantityDispensed: number;
  quantityOutstanding: number;
  unit: string;
  status: OrderItemFulfillmentStatus;
  dispensedByFacilityId?: string | null;
  dispensedByFacilityName?: string | null;
  dispensedAt?: string | null;
  routedToFacilityId?: string | null;
  routedToFacilityName?: string | null;
  /** Backend-derived: false once another facility dispensed or the
   * remaining quantity was routed elsewhere. */
  canDispense: boolean;
  blockedReason?: string | null;
}

export interface OrderPaymentSummary {
  status: 'held' | 'partially_released' | 'released' | 'refunded' | 'none';
  heldStroops: string;
  releasedStroops: string;
  refundedStroops: string;
  /** Plain-language rule supplied by docforum-core, shown verbatim. */
  rule: string;
}

export interface DispenseFulfillmentItemInput {
  quantity: number;
}

export interface RouteRemainingItemsInput {
  facilityId: string;
  itemIds: string[];
}

export type FulfillmentStatusUpdate = 'in_progress' | 'fulfilled' | 'rejected';

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

// --- Phase W4 — Facility Performance Insights (issue #57, assumed aggregate
// endpoint in docforum-core; see ARCHITECTURE_ESSENTIALS.md "Known assumptions")
// ---------------------------------------------------------------------------
// Deliberately aggregate-only: no patient identifiers, names or per-order rows
// ever reach this model. Reviewer must confirm.

export interface FacilityTurnaroundMetrics {
  /** Orders fulfilled in the period (denominator for the rates below). */
  fulfilledCount: number;
  /** Median time from assignment/receipt to fulfilment, in hours. */
  medianHours: number;
  /** 90th-percentile assignment → fulfilment time, in hours. */
  p90Hours: number;
  /** Fastest / slowest fulfilled order, in hours (context for the median). */
  minHours: number;
  maxHours: number;
  /** Fulfilled within each SLA bucket. */
  within1h: number;
  within4h: number;
  within24h: number;
  over24h: number;
  sampleSizeWarning: boolean;
}

export interface FacilityVolumeDay {
  date: string; // ISO date YYYY-MM-DD
  received: number;
  fulfilled: number;
  rejected: number;
}

export interface FacilityRejectionReason {
  /** Stable machine reason code, e.g. 'out_of_stock'. */
  code: string;
  /** Human-readable label for the code. */
  label: string;
  count: number;
  /** Share of all rejections in the period, 0-100. */
  percentage: number;
}

export interface FacilityDisputeMetrics {
  /** Payment intents for orders fulfilled in the period. */
  totalOrders: number;
  disputedOrders: number;
  /** Disputes per 100 orders, 0-100. */
  disputeRate: number;
  resolvedInFacilityFavour: number;
  resolvedInPatientFavour: number;
  /** Still open at period end. */
  openDisputes: number;
  averageResolutionHours: number;
  sampleSizeWarning: boolean;
}

export interface FacilityPerformanceInsights {
  facilityId: string;
  range: DateRange;
  generatedAt: string;
  turnaround: FacilityTurnaroundMetrics;
  volumeByDay: FacilityVolumeDay[];
  rejectionReasons: FacilityRejectionReason[];
  disputes: FacilityDisputeMetrics;
}

// --- Phase W6 — Admin audit & access logs (issue #71) -----------------------
// AuditEvent is real: mirrors docforum-core's `AuditEvent` model and
// `GET /admin/audit-events` (docforum-core#43, see its docs/api/README.md).
// AccessLog is assumed — docforum-core#45 hasn't landed; see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

/** One page of a keyset-paginated admin listing. `nextCursor` is opaque —
 * pass it back as `cursor`; `null` means this is the last page. */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuditEvent {
  id: string;
  // Null only for system-initiated transitions.
  actorUserId: string | null;
  actorRole: Role | null;
  // e.g. 'Appointment', 'DoctorProfile', 'PaymentIntent'.
  entityType: string;
  entityId: string;
  // e.g. 'appointment.booked', 'payment_intent.released'.
  action: string;
  fromState: string | null;
  toState: string | null;
  requestId: string | null;
  // Small flat map of ids/codes — never personal data (server-enforced).
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  actorUserId: string | null;
  actorRole: Role | null;
  entityType: string;
  entityId: string;
  // The API route that returned the PHI-bearing payload.
  route: string;
  createdAt: string;
}

// --- Phase W6 — Stuck referrals console (issue #72) --------------------------
// ReferralStatus and Specialty are real (docforum-core schema.prisma); the
// Referral fields follow its ARCHITECTURE.md §4.4, which schema.prisma hasn't
// caught up with yet. The admin queue/candidate shapes are assumed —
// docforum-core#68 (admin referral operations) and #65 (loop detection)
// haven't landed. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';

export interface Specialty {
  id: string;
  name: string;
  slug: string;
}

/** `snapshotNotes` is deliberately absent: it's encrypted clinical text that
 * the admin endpoints don't return and the console never needs. */
export interface Referral {
  id: string;
  sourceConsultationId: string;
  referringDoctorId: string;
  targetSpecialtyId: string;
  targetDoctorId: string | null;
  // docforum-core#65: the referral whose appointment produced this one.
  parentReferralId: string | null;
  status: ReferralStatus;
  resultingAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DoctorSummary = Pick<DoctorProfile, 'id' | 'fullName'>;

// --- Referral inbox (Phase W3 — assumed, docforum-core#5/#7 not landed) ---

/** Assumed (core `IntakeForm` is `{id, createdAt}` with `symptoms`/
 * `freeTextNotes` still TODO). This is the *snapshot copy* taken at
 * referral time — core's schema note is explicit that these must be copies,
 * not live references (ARCHITECTURE.md §4.4). */
export interface ReferralIntakeSnapshot {
  id: string;
  symptoms: string[];
  freeTextNotes?: string;
  submittedAt: string;
}

/** Minimal referring-doctor projection (assumed expansion). */
export interface ReferringDoctor {
  id: string;
  fullName: string;
}

export interface ReferralSummary {
  id: string;
  status: ReferralStatus;
  /** Mirrors core's real `snapshotNotes` — the referring doctor's note,
   * frozen at referral time. */
  snapshotNotes: string;
  referringDoctor: ReferringDoctor;
  targetSpecialty?: Specialty | null;
  // Assumed: `snapshotTakenAt` is a distinct field from core's `createdAt`.
  // If the real API only exposes `createdAt`, reconcile here.
  snapshotTakenAt: string;
  createdAt: string;
  updatedAt: string;
  /** Mirrors core's TODO `resultingAppointmentId`. */
  resultingAppointmentId?: string | null;
  appointment?: SlotAppointment | null;
}

export interface ReferralDetail extends ReferralSummary {
  intakeSnapshot: ReferralIntakeSnapshot;
}

export type StuckReferralReason = 'no_doctor' | 'doctor_inactive' | 'loop_flagged';

export interface ReferralChainLink {
  referralId: string;
  referringDoctor: DoctorSummary;
  targetSpecialty: Specialty;
  targetDoctor: DoctorSummary | null;
  status: ReferralStatus;
  createdAt: string;
}

export interface StuckReferral extends Referral {
  stuckReason: StuckReferralReason;
  targetSpecialty: Specialty;
  referringDoctor: DoctorSummary;
  targetDoctor: DoctorSummary | null;
  /** Oldest first, ending with this referral. Only sent for `loop_flagged`. */
  chain: ReferralChainLink[] | null;
}

/** A doctor as offered in the reassign picker, with near-term availability. */
export interface DoctorAvailability extends Pick<DoctorProfile, 'id' | 'fullName' | 'verificationStatus'> {
  specialties: Specialty[];
  // Open AvailabilitySlots in the next 7 days.
  openSlotCount: number;
  nextAvailableAt: string | null;
}

export interface ReassignReferralInput {
  targetDoctorId: string;
  reason: string;
  /** The `updatedAt` the admin saw — lets docforum-core answer `409` if
   * someone else acted on the referral in the meantime. */
  expectedUpdatedAt: string;
}

export interface CancelReferralInput {
  reason: string;
  expectedUpdatedAt: string;
}

// --- Phase W6 — Per-specialty verification review (issue #65) ----------------
// Assumed shapes: docforum-core#51 (per-specialty credential verification,
// PRD §8.1.5) hasn't landed. #51 names the two admin endpoints but not
// their payloads; the credential attachment, the filter parameters and the
// specialty catalog are this repo's assumption. See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

/** The document a doctor attached to back one specialty claim. */
export interface SpecialtyClaimCredential {
  id: string;
  fileName: string;
  /** `application/pdf` and images today; anything else is offered as a
   * download rather than previewed. */
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

// --- Doctor verification (Phase W3 — assumed, docforum-core#52/#51 not
// landed) ------------------------------------------------------------------

export type CredentialType =
  | 'medical_license'
  | 'degree_certificate'
  | 'specialty_certificate'
  | 'identity_document'
  | 'other';

/** Items in a doctor's application are each verified individually
 * (docforum-core#51), so this is per-document/per-specialty, not the
 * profile-level `VerificationStatus`. */
export type ClaimItemStatus = 'pending' | 'verified' | 'rejected';

export interface DoctorCredential {
  id: string;
  doctorProfileId: string;
  type: CredentialType;
  /** Display label only. The backend stores a key behind a signed/get-on-demand
   * URL — never a permanent public URL, and never rendered as a link here. */
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: ClaimItemStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  updatedAt: string;
}

/** Assumed (docforum-core#51): the doctor's own view of a specialty claim,
 * scoped by profile. The admin queue reads `SpecialtyClaim` below, which
 * carries the reviewer and doctor-summary projection instead. */
export interface DoctorSpecialtyClaim {
  id: string;
  doctorProfileId: string;
  specialtyId: string;
  specialty: Specialty;
  status: ClaimItemStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  updatedAt: string;
}

/** One doctor↔specialty pair awaiting review (a `DoctorSpecialty` row). */
export interface SpecialtyClaim {
  id: string;
  doctorId: string;
  doctor: DoctorSummary;
  specialtyId: string;
  specialty: Specialty;
  /** Always `pending` while in the queue — decided claims leave it. */
  status: VerificationStatus;
  /** Null when the doctor attached nothing — approving then is a judgement
   * call the UI must not hide. */
  credential: SpecialtyClaimCredential | null;
  /** What the doctor was told to fix, when rejected. */
  rejectionReason: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  /** When the doctor attached the specialty — drives the age filter. */
  createdAt: string;
  updatedAt: string;
}

export type ClaimDecision = 'approve' | 'reject';

export interface ReviewSpecialtyClaimInput {
  decision: ClaimDecision;
  /** Required for `reject`: what the doctor must fix or resubmit — the
   * doctor sees it. Optional note for `approve`. */
  reason: string | null;
  /** The `updatedAt` the admin saw — lets docforum-core answer `409` if
   * someone else reviewed the claim in the meantime. */
  expectedUpdatedAt: string;
}

// --- Phase W6 — System health (issue #73) ------------------------------------
// All assumed. Readiness follows docforum-core#104 (`/health/ready`: database,
// migrations, required config, optional Stellar RPC); jobs follow #100's
// `JobRun` table and `GET /admin/jobs`; the outbox summary follows #94's
// dead-letter state. None of the three has landed. See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

/** `degraded`: only optional checks are failing (e.g. Stellar RPC down takes
 * payments out, not the whole API — docforum-core#104). */
export type ReadinessStatus = 'ready' | 'degraded' | 'not_ready';

export type ReadinessCheckStatus = 'pass' | 'warn' | 'fail';

export interface ReadinessCheck {
  /** `database`, `migrations`, `config`, `stellar_rpc` today; others are shown by name. */
  name: string;
  status: ReadinessCheckStatus;
  /** Optional checks degrade readiness instead of failing it. */
  required: boolean;
  durationMs: number | null;
  /** Operator-facing detail, e.g. "2 migrations pending". Never secrets. */
  message: string | null;
}

export interface ReadinessReport {
  status: ReadinessStatus;
  /** When the checks actually ran — docforum-core caches the result for a few seconds. */
  checkedAt: string;
  checks: ReadinessCheck[];
}

export type JobRunStatus = 'running' | 'succeeded' | 'failed';

/** Mirrors docforum-core#100's `JobRun` row. */
export interface JobRun {
  id: string;
  job: string;
  status: JobRunStatus;
  startedAt: string;
  finishedAt: string | null;
  /** Failure message for `failed` runs; `null` otherwise. */
  error: string | null;
  itemsProcessed: number | null;
  /** `schedule` for ticks, `manual` for admin-triggered runs. */
  trigger: 'schedule' | 'manual';
}

export interface BackgroundJob {
  name: string;
  /** Human-readable schedule as registered, e.g. "every 5 minutes" or a cron expression. */
  schedule: string;
  lastRun: JobRun | null;
  lastSuccess: JobRun | null;
  lastFailure: JobRun | null;
  nextRunAt: string | null;
  /** True while any instance holds the job's advisory lock. */
  running: boolean;
}

export interface OutboxSummary {
  pendingCount: number;
  /** Events that exhausted their delivery attempts (docforum-core#94). */
  deadLetterCount: number;
  oldestPendingAt: string | null;
}

// --- Phase W6 — Feature flags console (issue #74) -----------------------------
// Assumed: docforum-core#132 (DB-backed feature flags) hasn't landed. The shape
// follows what #132 asks for — boolean and percentage flags, targeting by role
// or user-id allowlist, admin list/toggle endpoints with every change written
// as an audit event. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

export type FeatureFlagKind = 'boolean' | 'percentage';

// --- Closure calendar management (this PR) -------------------------------
export type ClosureStatus = 'active' | 'inactive';

export interface Closure {
  id: string;
  name: string;
  description?: string | null;
  status: ClosureStatus;
  allDay: boolean;
  start: string; // ISO datetime (timezone-aware)
  end: string; // ISO datetime (timezone-aware), exclusive end
  facilityId?: string | null; // null = platform-wide, otherwise scoped to facility
  createdAt: string;
  updatedAt: string;
}

export interface CreateClosureInput {
  name: string;
  description?: string | null;
  status?: ClosureStatus;
  allDay: boolean;
  start: string; // ISO datetime (timezone-aware)
  end: string; // ISO datetime (timezone-aware), exclusive end
  facilityId?: string | null; // null = platform-wide
}

export interface UpdateClosureInput {
  id: string;
  name?: string;
  description?: string | null;
  status?: ClosureStatus;
  allDay?: boolean;
  start?: string;
  end?: string;
  facilityId?: string | null;
}

// --- Affected appointments preview ---------------------------------------

export interface AffectedAppointment {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason?: string | null;
}

export interface FeatureFlagTargeting {
  /** Empty means every role is eligible. */
  roles: Role[];
  /** On for these users while the flag is enabled, whatever the roles or
   * rollout percentage say. */
  userIds: string[];
}

export interface FeatureFlag {
  id: string;
  /** Stable identifier the backend evaluates, e.g. `wallet_payments`. */
  key: string;
  description: string | null;
  kind: FeatureFlagKind;
  /** The kill switch: off means off for everyone, allowlist included. */
  enabled: boolean;
  /** Whole number 0–100 for `percentage` flags (sticky per user, hash-based),
   * null for `boolean` ones. */
  rolloutPercentage: number | null;
  targeting: FeatureFlagTargeting;
  createdAt: string;
  updatedAt: string;
}

// --- Invitation redemption — admins & facility staff (issue #81, PRD OQ-2) ---
// Admins and facility staff never self-register; they join through an
// invite link. These shapes are ASSUMED: they depend on docforum-core#39
// (admin invites) and docforum-core#75 (facility staff invites), neither
// of which has landed. See ARCHITECTURE_ESSENTIALS.md "Known assumptions".

/** Roles an invite may grant. Never patient/doctor — those self-serve. */
export type InviteRole = Extract<Role, 'facility' | 'admin'>;

export type AccountInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface AccountInvite {
  id: string;
  email: string;
  /** The role the account gets — server-side, from the invite. It is never
   * a form field; the client cannot choose or change it. */
  role: InviteRole;
  organisationName: string;
  organisationType: string | null;
  /** Full name of the person who sent the invite, if the server exposes it. */
  invitedBy: string | null;
  status: AccountInviteStatus;
  invitedAt: string;
  expiresAt: string;
}

/** Only the fields being changed are sent. */
export interface UpdateFeatureFlagInput {
  enabled?: boolean;
  rolloutPercentage?: number;
  targeting?: FeatureFlagTargeting;
  /** The `updatedAt` the admin saw — lets docforum-core answer `409` if
   * someone else changed the flag in the meantime. */
  expectedUpdatedAt: string;
}

// --- Phase W2 — Doctor search & symptom-based search (issue #30, builds on
// issue #1) ---------------------------------------------------------------
// Both endpoints are assumed: docforum-core#23 (doctor list) and
// docforum-core#60 (symptom → specialty mapping, controlled vocabulary,
// no ML) haven't landed. See ARCHITECTURE_ESSENTIALS.md "Known
// assumptions — Phase W2 — doctor & symptom search".

/** Patient-facing availability filter for doctor search. `week` means a
 * slot in the next 7 days; `today` means a slot before midnight today. */
export type AvailabilityFilter = 'any' | 'week' | 'today';

/** One entry of the backend's controlled symptom vocabulary. Patients pick
 * from these — free-text is never sent to a doctor-search endpoint. */
export interface SymptomSuggestion {
  slug: string;
  term: string;
}

/** Which specialties treat a vocabulary symptom (docforum-core#60). */
export interface SymptomSpecialtyMapping {
  slug: string;
  term: string;
  specialties: Specialty[];
}

export interface DoctorSearchQuery {
  specialtyIds?: string[];
  availability?: AvailabilityFilter;
}

/** A doctor as offered to a patient searching by specialty/symptom. Same
 * shape the admin referral console uses (`DoctorAvailability`) — one
 * entity, one shape, per ARCHITECTURE_ESSENTIALS.md hard rule 2. */
export type DoctorSearchResult = DoctorAvailability;

export interface AbnormalResult {
  id: string;
  patientProfileId: string;
  patientName: string;
  testName: string;
  value: string;
  referenceRange: string;
  isCritical: boolean;
  isAbnormal: boolean;
  issuedAt: string;
}

export interface AcknowledgeResultInput {
  note?: string;
}

export interface CalendarFeedResponse {
  icsUrl: string;
  // Token is part of the URL; we don't expose it separately
}

export interface RotateTokenResponse {
  icsUrl: string;
}

export interface LabResult {
  id: string;
  testName: string;
  value: string;
  referenceRange: string;
  isAbnormal: boolean;
  isCritical: boolean;
  issuedAt: string;
}

// --- Patient-side appointment view (issues #32/#33/#34/#37) ------------------
// `Appointment` above is the doctor-facing row the W3 queue screens use. The
// patient screens in this feature set read docforum-core's real
// `GET /appointments/mine`, which `include`s the availability slot and returns
// the origin and audit timestamps, so it is a different shape and gets its own
// name rather than a second declaration of `Appointment`. Dates are ISO strings
// because that is what JSON carries.

export type SlotStatus = 'open' | 'held' | 'booked';
export type AppointmentOrigin = 'direct_booking' | 'referral';

export interface AvailabilitySlot {
  id: string;
  doctorProfileId: string;
  status: SlotStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  // Assumed: the manager needs the booked appointment behind a `booked`
  // slot (core's `AvailabilitySlot.appointment` 1:1 relation) to show what
  // a blocked range would take out. Not returned by the public list
  // endpoint today. See ARCHITECTURE_ESSENTIALS.md.
  appointment?: SlotAppointment | null;
}

/** Assumed projection of docforum-core's real `Appointment` model, scoped
 * to what the availability calendar renders. */
export interface SlotAppointment {
  id: string;
  status: AppointmentStatus;
  // Assumed: expanded patient identity for the doctor's own calendar. The
  // core model only carries `patientProfileId`.
  patientFullName?: string;
}

/** Mirrors the real `POST /availability/doctors/:id/slots/generate` body —
 * fixed-length, single-day, no recurrence (core ARCHITECTURE.md §6.3.6). */
export interface SlotGenerationInput {
  date: string; // 'YYYY-MM-DD'
  startHour: number;
  endHour: number;
  slotLengthMinutes: number;
}

export interface SlotGenerationResult {
  created: number;
  skipped: number;
  slots: AvailabilitySlot[];
}

/** Assumed (docforum-core#53 not landed): block a range. `conflicts` is the
 * deliberate-handling list — the backend reports booked appointments inside
 * the range rather than cancelling them. */
export interface BlockRangeInput {
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface BlockRangeResult {
  blockedSlotIds: string[];
  conflicts: SlotAppointment[];
}

export interface PatientAppointment {
  id: string;
  patientProfileId: string;
  doctorProfileId: string;
  availabilitySlotId: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  availabilitySlot: AvailabilitySlot;
  createdAt: string;
  updatedAt: string;
}

// --- Live visit queue (#32) --------------------------------------------------
// assumed — docforum-core has no queue endpoint yet; the shape is the smallest
// one that can distinguish "no queue published" from "you are first".

export type QueuePhase = 'not_open' | 'waiting' | 'being_seen' | 'completed';

export interface AppointmentQueue {
  appointmentId: string;
  phase: QueuePhase;
  /** Patients still ahead. null means no queue is published yet — which is
   * not the same as being first. */
  peopleAhead: number | null;
  /** Minutes. Always rendered as an estimate. */
  estimatedWaitMinutes: number | null;
  /** null = this backend has no check-in window, so the UI says "check in on
   * the day" instead of inventing an opening time. */
  checkInOpensAt: string | null;
  checkedInAt: string | null;
}

// --- PHI access log (#34) ----------------------------------------------------
// assumed — docforum-core#40 (audit log read API) is not landed; these mirror
// the event its write-side middleware already records.

export type AccessActorRole = 'doctor' | 'facility' | 'patient' | 'admin';
export type AccessRecordType = 'health_profile' | 'appointment' | 'referral' | 'order' | 'dependent';
export type AccessReason = 'consultation' | 'order_fulfillment' | 'result_delivery' | 'handover_claim' | 'support';

export interface AccessLogEvent {
  id: string;
  occurredAt: string;
  actorRole: AccessActorRole;
  actorName: string;
  recordType: AccessRecordType;
  reason: AccessReason;
}

export interface AccessLogPage {
  events: AccessLogEvent[];
  nextCursor: string | null;
}

// --- Payment history and receipts (#37) --------------------------------------

export interface PaymentHistoryEntry extends PaymentIntent {
  /** assumed — the real row has no refund deadline column. */
  refundDeadlineAt?: string | null;
  /** assumed — the real response carries only `facilityId`, an internal id
   * the patient-facing UI must not render. */
  facilityName?: string;
}

export interface PaymentHistoryPage {
  intents: PaymentHistoryEntry[];
  nextCursor: string | null;
}

// --- Phase W6 — Fulfilment disputes (issue #76) -----------------------------
// Assumed contract: docforum-core#76 (facility fulfilment proof + patient
// receipt confirmation/dispute) has not landed. Endpoint paths and shapes are
// recorded in ARCHITECTURE_ESSENTIALS.md "Known assumptions"; reconcile here
// when that backend issue ships. A dispute is final once resolved: the held
// escrow is either released to the facility or refunded to the patient.

export type DisputeStatus = 'open' | 'resolved_facility' | 'resolved_patient';
export type DisputeResolution = 'facility' | 'patient';

/** Why the patient rejected the fulfilment. */
export type DisputeReason = 'not_received' | 'wrong_item' | 'incomplete' | 'damaged' | 'other';

export type DisputeAttachmentKind = 'dispensing_record' | 'specimen_id' | 'photo' | 'other';

export interface DisputeAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: DisputeAttachmentKind;
  uploadedAt: string;
  /** Display name or facility member id — never an email. */
  uploadedBy: string;
}

export interface DisputeFacilityProof {
  /** Dispensing record or specimen id the facility recorded. */
  reference: string;
  note: string | null;
  submittedAt: string;
  submittedBy: string;
  attachments: DisputeAttachment[];
}

export interface DisputePatientReport {
  reason: DisputeReason;
  description: string;
  submittedAt: string;
  /** Patient display name, never an email or profile id. */
  submittedBy: string;
}

export interface DisputePaymentSummary {
  intentId: string;
  status: PaymentIntentStatus;
  escrowId: string | null;
}

export type DisputeTimelineKind = 'opened' | 'proof_submitted' | 'patient_message' | 'payment' | 'resolved';

export interface DisputeTimelineEvent {
  id: string;
  at: string;
  actorRole: Role | 'system';
  actorName: string;
  kind: DisputeTimelineKind;
  summary: string;
}

/** Queue row — enough to triage without opening the detail. */
export interface FulfillmentDisputeSummary {
  id: string;
  status: DisputeStatus;
  orderId: string;
  orderType: OrderTypeForPayment;
  itemName: string;
  patientName: string;
  facility: { id: string; name: string };
  amountStroops: string;
  asset: PayoutAsset;
  reason: DisputeReason;
  openedAt: string;
  updatedAt: string;
}

export interface FulfillmentDispute extends FulfillmentDisputeSummary {
  patientReport: DisputePatientReport;
  facilityProof: DisputeFacilityProof | null;
  payment: DisputePaymentSummary;
  timeline: DisputeTimelineEvent[];
  resolvedAt: string | null;
  resolution: DisputeResolution | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
}

export interface ResolveDisputeInput {
  resolution: DisputeResolution;
  notes: string;
  /** The `updatedAt` the admin saw — a 409 means someone else resolved it. */
  expectedUpdatedAt: string;
}

/** One-time, short-lived URL for an attachment. Never rendered before the
 * admin asks for it, and never cached in the query client. */
export interface DisputeAttachmentUrl {
  url: string;
  expiresAt: string;
}

// --- Phase W5 — Pay with wallet (issue #59) ---------------------------------
// `POST /payments/intents/:id/prepare` and `POST /payments/intents/:id/submit`
// are assumed: docforum-core#80 and #81 describe both endpoints but have not
// landed. Everything else here (`PaymentIntent`, stroops as strings) is real.
// This repo never builds, simulates or submits a transaction — it hands the
// prepared XDR to the patient's wallet and returns the signed XDR (hard rule 1).

/** Unsigned transaction docforum-core built and simulated for this intent. */
export interface PreparedTransaction {
  intentId: string;
  /** The unsigned XDR — the only thing the patient's wallet ever sees. */
  xdr: string;
  /** ISO time after which the prepared transaction is no longer accepted.
   * Expiry is a normal outcome (ADR 0005), not an error. */
  expiresAt: string;
  /** Ledger sequence the transaction is valid until, when the backend knows it. */
  expiryLedger: number | null;
  status: PaymentIntentStatus;
}

// --- Phase W6 — Doctor verification review queue (issue #64) ----------------
// The queue and detail endpoints are assumed — docforum-core only serves
// `PATCH /doctors/:id/verification` today (real), and credential document
// storage is tracked in docforum-core#52. `VerificationStatus` and
// `DoctorProfile` are real.

/** One pending doctor in the review queue. */
export interface VerificationQueueItem {
  doctorProfileId: string;
  fullName: string;
  specialties: string[];
  /** When the doctor went in line for review (assumed: profile creation). */
  submittedAt: string;
  /** How many credential documents were submitted with the application. */
  documentCount: number;
  verificationStatus: VerificationStatus;
}

/** Credential document metadata — never the bytes, and never a durable URL:
 * documents are opened only through a fresh short-lived signed URL. */
export interface CredentialDocument {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface VerificationDetail {
  profile: {
    id: string;
    fullName: string;
    /** null when the backend doesn't expose the applicant's email to admins. */
    email: string | null;
    verificationStatus: VerificationStatus;
    specialties: string[];
    submittedAt: string;
    createdAt: string;
    /** Sent so decisions can carry `expectedUpdatedAt` for conflict detection. */
    updatedAt: string;
  };
  documents: CredentialDocument[];
}

export interface VerificationDecisionInput {
  status: Exclude<VerificationStatus, 'pending'>;
  /** Required for both approve and reject — it lands in the audit trail. */
  reason: string;
  /** The `updatedAt` the admin saw — a 409 means another admin decided first. */
  expectedUpdatedAt: string;
}

/** One entry of the per-doctor decision history, projected from docforum-core's
 * real audit trail (`GET /admin/audit-events?entityType=DoctorProfile&entityId=`). */
export interface VerificationDecision {
  id: string;
  at: string;
  from: VerificationStatus | null;
  to: VerificationStatus;
  actorUserId: string | null;
}

/** One-time, short-lived URL for a credential document — minted per click,
 * held in component state only, never cached on the document row. */
export interface CredentialDocumentUrl {
  url: string;
  expiresAt: string;
}

// --- Messaging & message attachments (Phase W2 — assumed, docforum-core
// #61 (thread) and #62 (attachments) not landed yet). See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions". Attachments are stored
// behind the thread's access rules; downloads always go through a
// short-lived signed URL minted per click, never a permanent link.

export type MessageThreadStatus = 'open' | 'closed';

export interface MessageThread {
  id: string;
  appointmentId: string;
  status: MessageThreadStatus;
  createdAt: string;
  updatedAt: string;
}

export type MessageAttachmentKind = 'image' | 'pdf';

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: MessageAttachmentKind;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderProfileId: string;
  body: string;
  attachments: MessageAttachment[];
  createdAt: string;
}

/** One page of a cursor-paginated thread. `nextCursor` is null at the
 * start of the thread (older history exhausted). */
export interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
}

export interface SendMessageInput {
  body: string;
  attachmentIds?: string[];
}

/** Short-lived signed download URL — minted per request, never persisted. */
export interface SignedDownloadUrl {
  url: string;
  expiresAt: string;
}

// --- Phase W4 — API keys & webhooks for facility integrations (issue #55,
// docforum-core#125/#126) ----------------------------------------------------
// Assumed: docforum-core#125 (API keys with HMAC signing) and #126 (signed
// outbound webhooks) haven't landed. Shapes follow what those issues ask
// for — prefix-only key display, one-time secret on creation, signed webhook
// deliveries with redelivery. See ARCHITECTURE_ESSENTIALS.md "Known
// assumptions — Phase W4".

export interface FacilityApiKey {
  id: string;
  facilityId: string;
  name: string;
  /** Safe prefix shown in list, e.g. `df_live_a1b2…` — never the full secret. */
  prefix: string;
  /** Event scopes this key may access, e.g. `['orders.read']`. Empty = all. */
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Returned only from the create call — the secret is never retrievable again. */
export interface CreatedApiKey extends FacilityApiKey {
  /** Full secret including prefix. Store nowhere client-side. */
  secret: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes?: string[];
}

export type WebhookEventType =
  | 'order.created'
  | 'order.assigned'
  | 'order.fulfilled'
  | 'order.cancelled'
  | 'payment.released'
  | 'payment.refunded';

export interface WebhookEndpoint {
  id: string;
  facilityId: string;
  url: string;
  events: WebhookEventType[];
  /** Signing secret prefix (safe to display). Full secret shown once on create. */
  secretPrefix: string;
  active: boolean;
  lastDeliveryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned only from the create call — the signing secret is never retrievable again. */
export interface CreatedWebhookEndpoint extends WebhookEndpoint {
  /** Full HMAC signing secret. Store nowhere client-side. */
  signingSecret: string;
}

export interface CreateWebhookInput {
  url: string;
  events: WebhookEventType[];
}

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEventType;
  status: WebhookDeliveryStatus;
  responseStatusCode: number | null;
  /** Short error message when failed; null otherwise. */
  errorMessage: string | null;
  attemptCount: number;
  deliveredAt: string | null;
  createdAt: string;
}

export interface RedeliverResponse {
  deliveryId: string;
  status: WebhookDeliveryStatus;
}

// --- Notification centre (issue #107) ---------------------------------------
// Assumed contract: docforum-core#93 (Notification model, provider-agnostic
// dispatch interface and the in-app inbox API) has not landed. The shapes
// follow what that issue asks for and are recorded in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Notification centre".

/** Known notification kinds. The API may add more, so a payload's `kind` is
 * typed as `NotificationKind | string` and unknown values render generically. */
export type NotificationKind =
  | 'appointment_booked'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'referral_created'
  | 'referral_accepted'
  | 'order_issued'
  | 'order_fulfilled'
  | 'order_rejected'
  | 'result_ready'
  | 'payment_due'
  | 'payment_escrowed'
  | 'payment_released'
  | 'payment_refunded'
  | 'message_received'
  | 'dispute_opened'
  | 'dispute_resolved';

/** One in-app notification. PHI-light by design: the title/body are written
 * by docforum-core for display and must never carry clinical detail beyond
 * what the destination screen already shows the recipient. */
export interface Notification {
  id: string;
  kind: NotificationKind | string;
  title: string;
  /** One-line, PHI-light summary. Rendered as text only, never HTML. */
  body: string;
  /** App-relative deep link (`/patient/orders/ord-1`), validated before use;
   * `null` for kinds that have no destination. */
  link: string | null;
  /** `null` while unread. */
  readAt: string | null;
  createdAt: string;
}

/** Cursor-paginated inbox page. `unreadCount` is the server's total for the
 * whole inbox (not this page), so the bell badge is correct before every
 * page has been loaded. */
export interface NotificationPage {
  items: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}

/** Ticket for the live SSE stream. `EventSource` cannot send an Authorization
 * header, so the short-lived ticket — never the access token — travels in the
 * stream URL. */
export interface NotificationStreamTicket {
  /** Opaque, single-use, expires within a minute. */
  ticket: string;
  /** App-relative stream path including the ticket, e.g.
   * `/notifications/stream?ticket=…`. */
  streamPath: string;
  expiresAt: string;
}

/** A live `notification` SSE event's payload. */
export type NotificationStreamEvent =
  | { type: 'notification'; notification: Notification; unreadCount: number }
  | { type: 'read'; notificationIds: string[]; unreadCount: number };

// --- Phase W7 — Evaluated feature flags for the signed-in user (issue #111) --
// Assumed shape pending docforum-core#132: `GET /me/flags` returns the
// server-evaluated boolean for every flag that applies to this user. The
// frontend never evaluates rollout rules itself. See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W7".

export interface EvaluatedFlags {
  /** Flag key → evaluated boolean. Unknown keys are ignored by typed UI. */
  flags: Record<string, boolean>;
  /** When docforum-core evaluated the flags, if it reports it. */
  evaluatedAt?: string | null;
}

// --- Phase W7 — Notification preferences and quiet hours (issue #108) -------
// Assumed shape pending docforum-core#99. Preferences are per notification
// type × channel; safety-critical types are server-locked and always on.
// See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W7".

export type NotificationChannel = 'email' | 'sms' | 'in_app';

export type NotificationType =
  | 'appointment_reminders'
  | 'appointment_changes'
  | 'new_message'
  | 'referral_updates'
  | 'order_updates'
  | 'payment_receipts'
  | 'marketing'
  | 'critical_lab_result'
  | 'security_alert';

export interface NotificationPreference {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  /** Safety-critical rows can't be turned off, in the UI or the API. */
  locked: boolean;
  /** Why the row is locked; required when `locked` is true. */
  lockedReason?: string | null;
}

export interface QuietHours {
  enabled: boolean;
  /** Local wall-clock HH:MM in `timeZone`. */
  start: string;
  end: string;
  /** IANA zone the quiet-hours window is interpreted in. */
  timeZone: string;
}

export interface NotificationPreferences {
  preferences: NotificationPreference[];
  quietHours: QuietHours;
  updatedAt?: string;
}

export interface UpdateNotificationPreferencesInput {
  preferences?: Array<Pick<NotificationPreference, 'type' | 'channel' | 'enabled'>>;
  quietHours?: QuietHours;
}

// --- Types moved to the generated schema in the typed-client branch --------
// Upstream declares these in the services that use them; the typed client
// branch re-exports the generated shapes from here. Keep the local aliases so
// both sets of imports resolve.
export type HealthEntryUpdate = {
  name?: string;
  details?: string | null;
};

export interface CreatePaymentIntentInput {
  orderType: OrderTypeForPayment;
  orderId: string;
  patientProfileId: string;
  facilityId: string;
  amountStroops: string;
}
