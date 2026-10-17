import { apiFetch } from './api-client';
import type { Prescription } from '../types/models';

// Assumed contract (docforum-core#9 not landed): list a profile's active
// prescriptions. See ARCHITECTURE_ESSENTIALS.md — this is the only place the
// path/query live; feature code never calls fetch directly.
export function listActivePrescriptions(
  patientProfileId: string,
  accessToken: string,
): Promise<Prescription[]> {
  return apiFetch<Prescription[]>(
    `/patients/${patientProfileId}/prescriptions?status=active`,
    { accessToken },
  );
}
