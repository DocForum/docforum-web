// Doctor-scoped reads for the doctor's own account. Kept deliberately small:
// verification calls land in `doctor-verification-service.ts` (another
// contributor owns that flow), availability lives in `availability-service.ts`.
import { apiFetch } from './api-client';
import type { DoctorProfile } from '../types/models';

/** REAL: `GET /doctors/me`. The availability manager needs its own profile id
 * for the generation endpoint, and reads it from the server rather than from
 * anything stored client-side. */
export function getMyDoctorProfile(accessToken: string): Promise<DoctorProfile> {
  return apiFetch<DoctorProfile>('/doctors/me', { accessToken });
}
