import type { DoctorAvailability } from './referral-inbox';
import type { Specialty } from './stuck-referrals';

// --- Phase W2 — Doctor search & symptom-based search (issue #30, builds on
// issue #1) ---------------------------------------------------------------
// Both endpoints are assumed: docforum-core#23 (doctor list) and
// docforum-core#60 (symptom → specialty mapping, controlled vocabulary,
// no ML) haven't landed. See ARCHITECTURE_ESSENTIALS.md "Known
// assumptions — Phase W2 — doctor & symptom search".

/** Patient-facing availability filter for doctor search. `week` means a
 * slot in the next 7 days; `today` means a slot before midnight today. */
export type AvailabilityFilter = 'any' | 'week' | 'today';

/** One entry of the backend's controlled symptom vocabulary. Patients pick
 * from these — free-text is never sent to a doctor-search endpoint. */
export interface SymptomSuggestion {
  slug: string;
  term: string;
}

/** Which specialties treat a vocabulary symptom (docforum-core#60). */
export interface SymptomSpecialtyMapping {
  slug: string;
  term: string;
  specialties: Specialty[];
}

export interface DoctorSearchQuery {
  specialtyIds?: string[];
  availability?: AvailabilityFilter;
}

/** A doctor as offered to a patient searching by specialty/symptom. Same
 * shape the admin referral console uses (`DoctorAvailability`) — one
 * entity, one shape, per ARCHITECTURE_ESSENTIALS.md hard rule 2. */
export type DoctorSearchResult = DoctorAvailability;

export interface AbnormalResult {
  id: string;
  patientProfileId: string;
  patientName: string;
  testName: string;
  value: string;
  referenceRange: string;
  isCritical: boolean;
  isAbnormal: boolean;
  issuedAt: string;
}

export interface AcknowledgeResultInput {
  note?: string;
}

export interface CalendarFeedResponse {
  icsUrl: string;
  // Token is part of the URL; we don't expose it separately
}

export interface RotateTokenResponse {
  icsUrl: string;
}

export interface LabResult {
  id: string;
  testName: string;
  value: string;
  referenceRange: string;
  isAbnormal: boolean;
  isCritical: boolean;
  issuedAt: string;
}
