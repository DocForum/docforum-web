// Doctor verification calls to docforum-core. The doctor's own profile read
// lives in `doctor-service.ts` (`getMyDoctorProfile`) — one reader per real
// endpoint, so the availability manager and this flow never diverge.
//
// Everything in this file is ASSUMED (docforum-core#52/#51 are not landed) —
// see ARCHITECTURE_ESSENTIALS.md.
import { apiFetch, apiUpload } from './api-client';
import type { CredentialType, DoctorCredential, Specialty, SpecialtyClaim } from '../types/models';

/** Wired through to `apiUpload`, which is the only place XHR lives. */
export interface UploadHandlers {
  signal?: AbortSignal;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
}

export function listMyCredentials(accessToken: string): Promise<DoctorCredential[]> {
  return apiFetch<DoctorCredential[]>('/doctors/me/credentials', { accessToken });
}

export function uploadCredential(
  file: File,
  type: CredentialType,
  accessToken: string,
  handlers: UploadHandlers = {},
): Promise<DoctorCredential> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  return apiUpload<DoctorCredential>('/doctors/me/credentials', { formData, accessToken, ...handlers });
}

export function resubmitCredential(
  credentialId: string,
  file: File,
  accessToken: string,
  handlers: UploadHandlers = {},
): Promise<DoctorCredential> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<DoctorCredential>(`/doctors/me/credentials/${credentialId}/resubmit`, {
    formData,
    accessToken,
    ...handlers,
  });
}

export function deleteCredential(credentialId: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/doctors/me/credentials/${credentialId}`, { method: 'DELETE', accessToken });
}

/** Controlled catalog — public on the backend, sent the token only because
 * every caller of it here is already an authenticated application flow. */
export function listSpecialties(accessToken?: string | null): Promise<Specialty[]> {
  return apiFetch<Specialty[]>('/specialties', { accessToken });
}

export function listMySpecialtyClaims(accessToken: string): Promise<SpecialtyClaim[]> {
  return apiFetch<SpecialtyClaim[]>('/doctors/me/specialty-claims', { accessToken });
}

export function createSpecialtyClaim(
  specialtyId: string,
  accessToken: string,
): Promise<SpecialtyClaim> {
  return apiFetch<SpecialtyClaim>('/doctors/me/specialty-claims', {
    method: 'POST',
    body: { specialtyId },
    accessToken,
  });
}

export function deleteSpecialtyClaim(claimId: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/doctors/me/specialty-claims/${claimId}`, { method: 'DELETE', accessToken });
}

export function resubmitSpecialtyClaim(
  claimId: string,
  accessToken: string,
): Promise<SpecialtyClaim> {
  return apiFetch<SpecialtyClaim>(`/doctors/me/specialty-claims/${claimId}/resubmit`, {
    method: 'POST',
    body: {},
    accessToken,
  });
}
