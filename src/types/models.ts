// Backend model types — thin re-exports of the generated
// `@docforum/api-client` schema.
//
// The OpenAPI fixture in packages/api-client is the source of truth for the
// contracts covered by docforum-core#113. Only genuinely frontend-only UI
// state and the still-unpublished W6 contracts are declared locally here.
import type { Schemas } from '@docforum/api-client';

// --- Identity & auth -------------------------------------------------------
export type Role = Schemas['Role'];
export type SelfServeRole = Schemas['SelfServeRole'];
export type User = Schemas['User'];
export type VerificationStatus = Schemas['VerificationStatus'];
export type PatientProfile = Schemas['PatientProfile'];
export type DoctorProfile = Schemas['DoctorProfile'];

// --- Facilities ------------------------------------------------------------
export type FacilityType = Schemas['FacilityType'];
export type FacilityProfile = Schemas['FacilityProfile'];
export type FacilityLocation = Schemas['FacilityLocation'];
export type FacilityWithDistance = Schemas['FacilityWithDistance'];

// --- Dependents & handover -------------------------------------------------
export type Relationship = Schemas['Relationship'];
export type HandoverStatus = Schemas['HandoverStatus'];
export type Dependent = Schemas['Dependent'];
export type DependentInput = Schemas['DependentInput'];

// --- Health profile --------------------------------------------------------
export type HealthSectionKey = Schemas['HealthSectionKey'];
export type HealthEntry = Schemas['HealthEntry'];
export type HealthEntryInput = Schemas['HealthEntryInput'];
export type HealthEntryUpdate = Schemas['HealthEntryUpdate'];

// --- Client-only acting-for state -----------------------------------------
export interface ActingProfile {
  id: string;
  fullName: string;
  isSelf: boolean;
}

// --- Payments --------------------------------------------------------------
export type WalletLink = Schemas['WalletLink'];
export type OrderTypeForPayment = Schemas['OrderTypeForPayment'];
export type PaymentIntentStatus = Schemas['PaymentIntentStatus'];
export type PaymentIntent = Schemas['PaymentIntent'];
export type CreatePaymentIntentInput = Schemas['CreatePaymentIntentInput'];

// --- Data export & account deletion ---------------------------------------
export type DataExportStatus = Schemas['DataExportStatus'];
export type DataExport = Schemas['DataExport'];
export type DeleteAccountResponse = Schemas['DeleteAccountResponse'];

// --- Care thread timeline --------------------------------------------------
export type CareStepType = Schemas['CareStepType'];
export type CareStepStatus = Schemas['CareStepStatus'];
export type CareThreadStep = Schemas['CareThreadStep'];
export type CareThread = Schemas['CareThread'];

// --- Doctor core flow ------------------------------------------------------
export type AppointmentStatus = Schemas['AppointmentStatus'];
export type Appointment = Schemas['Appointment'];
export type QueueEntry = Schemas['QueueEntry'];
export type RunningDelay = Schemas['RunningDelay'];
export type UpdateRunningDelayInput = Schemas['UpdateRunningDelayInput'];
export type MessageThread = Schemas['MessageThread'];
export type ThreadFilter = 'all' | 'unread' | 'closing_soon';
export type ConsultationNote = Schemas['ConsultationNote'];
export type ConsultationAddendum = Schemas['ConsultationAddendum'];
export type AddAddendumInput = Schemas['AddAddendumInput'];

// --- Doctor practice insights ---------------------------------------------
export type DateRangePreset = Schemas['DateRangePreset'];
export type DateRange = Schemas['DateRange'];
export type UtilisationWeek = Schemas['UtilisationWeek'];
export type NoShowMetrics = Schemas['NoShowMetrics'];
export type ReferralTurnaroundMetrics = Schemas['ReferralTurnaroundMetrics'];
export type MessageResponseMetrics = Schemas['MessageResponseMetrics'];
export type DoctorPracticeInsights = Schemas['DoctorPracticeInsights'];

// --- Facility team & fulfillment attribution -------------------------------
export type FacilityMemberRole = Schemas['FacilityMemberRole'];
export type FacilityMember = Schemas['FacilityMember'];
export type InviteStatus = Schemas['InviteStatus'];
export type FacilityInvite = Schemas['FacilityInvite'];
export type InviteMemberInput = Schemas['InviteMemberInput'];
export type RemoveMemberResponse = Schemas['RemoveMemberResponse'];
export type FulfillmentOrderType = Schemas['FulfillmentOrderType'];
export type FulfillmentItemStatus = Schemas['FulfillmentItemStatus'];
export type FulfillmentActionAttribution = Schemas['FulfillmentActionAttribution'];
export type FulfillmentQueueItem = Schemas['FulfillmentQueueItem'];

// --- W4 scan and payout contracts -----------------------------------------
// These backend routes are present in the current UI but have not yet been
// added to the vendored OpenAPI fixture. Keep their compatibility types here
// until the backend publishes them in the generated package.
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

export type EscrowPayoutStatus = 'held' | 'released' | 'refunded';
export type PayoutAsset = 'XLM' | 'USDC';

export interface EscrowTerms {
  releaser: 'patient' | 'auto_dispense' | 'platform';
  releaserDescription: string;
  refundDeadline: string;
  isApproachingDeadline: boolean;
  hoursUntilRefund: number;
}

export interface FacilityLedgerEntry {
  id: string;
  facilityId: string;
  orderId: string;
  orderType: FulfillmentOrderType;
  orderItemName: string;
  patientName: string;
  amountStroops: string;
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

// --- W6 admin contracts ---------------------------------------------------
// These are kept as compatibility types for the admin endpoints that are
// still awaiting their backend OpenAPI publication.
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuditEvent {
  id: string;
  actorUserId: string | null;
  actorRole: Role | null;
  entityType: string;
  entityId: string;
  action: string;
  fromState: string | null;
  toState: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  actorUserId: string | null;
  actorRole: Role | null;
  entityType: string;
  entityId: string;
  route: string;
  createdAt: string;
}

export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';

export interface Specialty {
  id: string;
  name: string;
  slug: string;
}

export interface Referral {
  id: string;
  sourceConsultationId: string;
  referringDoctorId: string;
  targetSpecialtyId: string;
  targetDoctorId: string | null;
  parentReferralId: string | null;
  status: ReferralStatus;
  resultingAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DoctorSummary = Pick<DoctorProfile, 'id' | 'fullName'>;
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
  chain: ReferralChainLink[] | null;
}

export interface DoctorAvailability extends Pick<DoctorProfile, 'id' | 'fullName' | 'verificationStatus'> {
  specialties: Specialty[];
  openSlotCount: number;
  nextAvailableAt: string | null;
}

export interface ReassignReferralInput {
  targetDoctorId: string;
  reason: string;
  expectedUpdatedAt: string;
}

export interface CancelReferralInput {
  reason: string;
  expectedUpdatedAt: string;
}

export type ReadinessStatus = 'ready' | 'degraded' | 'not_ready';
export type ReadinessCheckStatus = 'pass' | 'warn' | 'fail';

export interface ReadinessCheck {
  name: string;
  status: ReadinessCheckStatus;
  required: boolean;
  durationMs: number | null;
  message: string | null;
}

export interface ReadinessReport {
  status: ReadinessStatus;
  checkedAt: string;
  checks: ReadinessCheck[];
}

export type JobRunStatus = 'running' | 'succeeded' | 'failed';

export interface JobRun {
  id: string;
  job: string;
  status: JobRunStatus;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  itemsProcessed: number | null;
  trigger: 'schedule' | 'manual';
}

export interface BackgroundJob {
  name: string;
  schedule: string;
  lastRun: JobRun | null;
  lastSuccess: JobRun | null;
  lastFailure: JobRun | null;
  nextRunAt: string | null;
  running: boolean;
}

export interface OutboxSummary {
  pendingCount: number;
  deadLetterCount: number;
  oldestPendingAt: string | null;
}

export type FeatureFlagKind = 'boolean' | 'percentage';

export interface FeatureFlagTargeting {
  roles: Role[];
  userIds: string[];
}

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  kind: FeatureFlagKind;
  enabled: boolean;
  rolloutPercentage: number | null;
  targeting: FeatureFlagTargeting;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFeatureFlagInput {
  enabled?: boolean;
  rolloutPercentage?: number;
  targeting?: FeatureFlagTargeting;
  expectedUpdatedAt: string;
}
