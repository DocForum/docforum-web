import { useDoctorOnboarding } from '../hooks/useOnboarding';
import { DOCTOR_TOUR, doctorOnboardingSteps } from '../steps';
import { GuidedTour } from './GuidedTour';
import { OnboardingChecklist } from './OnboardingChecklist';
import { OnboardingNotice } from './OnboardingNotice';

/** First-run setup for doctors: verification, specialties and availability.
 * All three flags are server-computed, so there is no client-side “I saw the
 * checklist” state to fall out of sync. */
export function DoctorOnboarding() {
  const { data, isError } = useDoctorOnboarding();
  const steps = data ? doctorOnboardingSteps(data) : null;
  const allDone = steps?.every((step) => step.complete) ?? false;

  return (
    <>
      {isError ? (
        <OnboardingNotice>
          We couldn’t check your setup just now. Everything in the app still works — reload the page to
          try again.
        </OnboardingNotice>
      ) : null}
      {steps ? (
        <OnboardingChecklist
          title="Finish setting up your practice"
          intro="These steps come from your verification and availability records. Nothing here blocks access to your dashboard."
          steps={steps}
        />
      ) : null}
      {steps && !allDone ? <GuidedTour label="How DocForum works for doctors" steps={DOCTOR_TOUR} /> : null}
    </>
  );
}
