import { useQuery } from '@tanstack/react-query';
import { onboardingKeys } from '../../../query-keys';
import * as onboardingService from '../../../services/onboarding-service';
import { useAuthStore } from '../../../store/auth-store';

/** Server-computed setup progress for the signed-in patient. Never cached
 * in a browser flag: a new device sees the same checklist state. */
export function usePatientOnboarding() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: onboardingKeys.patient(),
    queryFn: ({ signal }) => onboardingService.getPatientOnboarding(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useDoctorOnboarding() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: onboardingKeys.doctor(),
    queryFn: ({ signal }) => onboardingService.getDoctorOnboarding(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}
