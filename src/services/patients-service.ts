import { apiFetch } from './api-client';
import type { PatientProfile } from '../types/models';

// ASSUMED (docforum-core has `GET /doctors/me` for the doctor side but no
// patient equivalent yet): the client cannot scope `/patients/:profileId/...`
// reads without knowing its own profile id, and `POST /auth/login` returns
// only `{ user, accessToken }`. Reconcile when the real route lands.
export function getMyPatientProfile(accessToken: string): Promise<PatientProfile> {
  return apiFetch<PatientProfile>('/patients/me', { accessToken });
}
