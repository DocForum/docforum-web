// The signed-in doctor's own profile — real endpoint, `GET /doctors/me`
// (docforum-core `backend/src/modules/doctors`). Used to pre-empt the
// verified-profile gate that order issuance enforces server-side.
import { apiFetch } from './api-client';
import type { MyDoctorProfile } from '../types/models';

export function getMyDoctorProfile(accessToken: string): Promise<MyDoctorProfile> {
  return apiFetch<MyDoctorProfile>('/doctors/me', { accessToken });
}
