// Role-specific first-run checklist (#121). Every `complete` flag comes
// from the server summary — this module only turns those flags into copy
// and destinations, so a new device shows the same state.
import type { DoctorOnboardingStatus, PatientOnboardingStatus } from '../../types/models';

export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  /** Where the user can do this, when such a screen exists today. */
  to?: string;
  complete: boolean;
}

export function patientOnboardingSteps(status: PatientOnboardingStatus): OnboardingStep[] {
  return [
    {
      key: 'profile',
      label: 'Finish your profile',
      description: 'Add your name, date of birth and contact details so clinics can reach you.',
      to: '/patient/settings',
      complete: status.profileComplete,
    },
    {
      key: 'health-profile',
      label: 'Fill in your health profile',
      description: 'Record allergies, conditions and medications so care teams treat you safely.',
      to: '/patient/health',
      complete: status.healthProfileComplete,
    },
    {
      key: 'first-search',
      label: 'Find a pharmacy or lab',
      description: 'Search nearby facilities once — it saves time when you need a prescription or test.',
      to: '/patient/facilities',
      complete: status.firstSearchComplete,
    },
  ];
}

export function doctorOnboardingSteps(status: DoctorOnboardingStatus): OnboardingStep[] {
  return [
    {
      key: 'documents',
      label: 'Submit verification documents',
      description:
        'Add your medical licence and identity documents. The platform team reviews them before your profile goes live.',
      complete: status.documentsComplete,
    },
    {
      key: 'specialties',
      label: 'List your specialties',
      description: 'Say what you practise so patients and referrals can find the right doctor.',
      complete: status.specialtiesComplete,
    },
    {
      key: 'availability',
      label: 'Publish your availability',
      description: 'Open at least one slot so patients can book you.',
      complete: status.availabilityComplete,
    },
  ];
}

export interface TourStep {
  title: string;
  body: string;
}

export const PATIENT_TOUR: TourStep[] = [
  {
    title: 'Welcome to DocForum',
    body: 'This is your care hub. It gathers visits, health records and orders from your care team in one place.',
  },
  {
    title: 'Keep your health profile current',
    body: 'Allergies, conditions and medications help clinicians treat you safely — only your care team can see them.',
  },
  {
    title: 'Find care near you',
    body: 'Search pharmacies and labs from the Facilities page, then order and pay without leaving the app.',
  },
];

export const DOCTOR_TOUR: TourStep[] = [
  {
    title: 'Welcome to DocForum',
    body: 'Your dashboard shows the live queue, today\u2019s appointments and anything that needs a clinician\u2019s attention.',
  },
  {
    title: 'Your day at a glance',
    body: 'Check-in opens on the day of the visit. Expand an appointment to read the intake form before the consultation.',
  },
  {
    title: 'Get verified, then open your calendar',
    body: 'Verification and availability decide when patients can book you. The setup checklist above tracks both.',
  },
];
