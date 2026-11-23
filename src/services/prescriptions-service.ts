import { apiFetch } from './api-client';
import type {
  IssueLabOrderInput,
  IssuePrescriptionInput,
  IssuedLabOrder,
  IssuedPrescription,
  MedicationPrescription,
} from '../types/models';

// Assumed contract (docforum-core#9 not landed): list a profile's active
// prescriptions. See ARCHITECTURE_ESSENTIALS.md — this is the only place the
// path/query live; feature code never calls fetch directly.
export function listActivePrescriptions(
  patientProfileId: string,
  accessToken: string,
): Promise<MedicationPrescription[]> {
  return apiFetch<MedicationPrescription[]>(
    `/patients/${patientProfileId}/prescriptions?status=active`,
    { accessToken },
  );
}

/** `POST /orders/consultations/:consultationId/prescriptions` (issue #267). */
export function issuePrescription(
  consultationId: string,
  input: IssuePrescriptionInput,
  accessToken: string,
): Promise<IssuedPrescription> {
  return apiFetch<IssuedPrescription>(
    `/orders/consultations/${encodeURIComponent(consultationId)}/prescriptions`,
    { method: 'POST', body: input, accessToken },
  );
}

/** `POST /orders/consultations/:consultationId/lab-orders` (issue #267). */
export function issueLabOrder(
  consultationId: string,
  input: IssueLabOrderInput,
  accessToken: string,
): Promise<IssuedLabOrder> {
  return apiFetch<IssuedLabOrder>(
    `/orders/consultations/${encodeURIComponent(consultationId)}/lab-orders`,
    { method: 'POST', body: input, accessToken },
  );
}
