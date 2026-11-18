import { apiFetch } from './api-client';
import type { MedicationPrescription } from '../types/models';

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
