import type { ConsultationOutcome } from './doctor-core-flow';
import type { DoctorProfile } from './session-idle-timeout';
import type { PaymentIntent } from './payments';

// --- Consultation order issuance (issue #267) -------------------------------
// REAL contract (docforum-core `backend/src/modules/orders`): a verified doctor
// closes the visit with `POST /orders/consultations` and then issues orders
// against that consultation. Shapes mirror
// `backend/prisma/schema/{consultations,prescriptions-labs}.prisma` and the
// `201` bodies the orders controllers serialize.

export interface Consultation {
  id: string;
  appointmentId: string;
  outcome: ConsultationOutcome | null;
  /** Clinical free text — PHI, never logged or put in analytics. */
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationInput {
  appointmentId: string;
  outcome?: ConsultationOutcome | null;
  notes?: string | null;
}

export type ConsultationOrderStatus =
  | 'issued'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'expired'
  | 'superseded';

export interface PrescriptionItemInput {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface ConsultationPrescriptionItem extends PrescriptionItemInput {
  id: string;
  prescriptionId: string;
}

/** A core prescription row. Append-only: corrections are new rows carrying
 * `supersedesPrescriptionId`; the client never edits an issued order. */
export interface ConsultationPrescription {
  id: string;
  consultationId: string;
  patientProfileId: string;
  prescribingDoctorId: string;
  facilityProfileId: string;
  /** Positive integer stroops, carried as a string (BigInt on the server). */
  amountStroops: string;
  status: ConsultationOrderStatus;
  supersedesPrescriptionId: string | null;
  createdAt: string;
  items: ConsultationPrescriptionItem[];
}

export type LabOrderUrgency = 'routine' | 'urgent';

export interface ConsultationLabOrder {
  id: string;
  consultationId: string;
  patientProfileId: string;
  orderingDoctorId: string;
  facilityProfileId: string;
  amountStroops: string;
  testType: string;
  urgency: LabOrderUrgency;
  /** Clinical free text — PHI. */
  notes: string | null;
  status: ConsultationOrderStatus;
  supersedesLabOrderId: string | null;
  createdAt: string;
  expiresAt: string | null;
}

/** Exactly one of these is sent, never both (docforum-core rejects both). */
export interface OrderPricingInput {
  amountStroops?: string;
  catalogItemCode?: string;
}

export interface IssuePrescriptionInput extends OrderPricingInput {
  facilityProfileId: string;
  items: PrescriptionItemInput[];
  supersedesPrescriptionId?: string;
}

export interface IssueLabOrderInput extends OrderPricingInput {
  facilityProfileId: string;
  testType: string;
  urgency?: LabOrderUrgency;
  notes?: string;
  supersedesLabOrderId?: string;
}

/** The `201` body: the immutable order plus its payment intent. */
export interface IssuedPrescription extends ConsultationPrescription {
  paymentIntent: PaymentIntent;
}

export interface IssuedLabOrder extends ConsultationLabOrder {
  paymentIntent: PaymentIntent;
}

/** `GET /doctors/me` — the signed-in doctor's own profile. */
export interface MyDoctorProfile extends DoctorProfile {
  timeZone: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
