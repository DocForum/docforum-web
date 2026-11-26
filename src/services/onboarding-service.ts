// First-run onboarding summary (#121). PROVISIONAL endpoints: docforum-core
// has no onboarding route yet, so the server is assumed to compute these
// flags from real records (profile fields, health entries, search history;
// doctor documents, specialties, open availability slots). The frontend
// never stores completion itself — see ARCHITECTURE_ESSENTIALS.md
// "Known assumptions — First-run onboarding".
import { apiFetch } from './api-client';
import type { DoctorOnboardingStatus, PatientOnboardingStatus } from '../types/models';

export function getPatientOnboarding(
  accessToken: string,
  signal?: AbortSignal,
): Promise<PatientOnboardingStatus> {
  return apiFetch<PatientOnboardingStatus>('/patients/me/onboarding', { accessToken, signal });
}

export function getDoctorOnboarding(
  accessToken: string,
  signal?: AbortSignal,
): Promise<DoctorOnboardingStatus> {
  return apiFetch<DoctorOnboardingStatus>('/doctors/me/onboarding', { accessToken, signal });
}
