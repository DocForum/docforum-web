// --- First-run onboarding (#121) --------------------------------------------
// Assumed shape: docforum-core has no onboarding summary endpoint yet. Each
// flag is computed by the server from real records — never from a browser
// flag — so the checklist is correct on a new device:
//   patient: profile fields, at least one health entry, at least one past
//            facility/symptom search;
//   doctor:  verification documents submitted, at least one specialty
//            registered, at least one open availability slot.
// See ARCHITECTURE_ESSENTIALS.md "Known assumptions — First-run onboarding".

export interface PatientOnboardingStatus {
  profileComplete: boolean;
  healthProfileComplete: boolean;
  firstSearchComplete: boolean;
}

export interface DoctorOnboardingStatus {
  documentsComplete: boolean;
  specialtiesComplete: boolean;
  availabilityComplete: boolean;
}
