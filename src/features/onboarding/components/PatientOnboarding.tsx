import { usePatientOnboarding } from '../hooks/useOnboarding';
import { PATIENT_TOUR, patientOnboardingSteps } from '../steps';
import { GuidedTour } from './GuidedTour';
import { OnboardingChecklist } from './OnboardingChecklist';
import { OnboardingNotice } from './OnboardingNotice';

/** First-run setup for patients. Progress comes from the server summary, so
 * it is identical on every device; nothing here is stored in the browser. */
export function PatientOnboarding() {
  const { data, isError } = usePatientOnboarding();
  const steps = data ? patientOnboardingSteps(data) : null;
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
          title="Get set up"
          intro="Three quick steps so your care team has what it needs and you can find care nearby."
          steps={steps}
        />
      ) : null}
      {steps && !allDone ? <GuidedTour label="How DocForum works for patients" steps={PATIENT_TOUR} /> : null}
    </>
  );
}
