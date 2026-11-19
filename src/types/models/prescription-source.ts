import type { FacilityLocation } from './facility-finder';
import type { OrderVersionBase, Prescription } from './patient-orders';
import type { FacilityProfile } from './session-idle-timeout';

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
