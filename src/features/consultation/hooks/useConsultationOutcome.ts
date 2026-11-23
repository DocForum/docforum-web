import { useMutation, useQuery } from '@tanstack/react-query';
import * as consultationService from '../../../services/consultation-service';
import * as verificationService from '../../../services/doctor-verification-service';
import * as searchService from '../../../services/search-service';
import { useAuthStore } from '../../../store/auth-store';
import type { CreateConsultationReferralInput } from '../../../types/models';

/**
 * Atomic multi-target referrals (issue #266). The batch is sent as one request:
 * a validation or routing failure creates none of the targets.
 */
export function useCreateConsultationReferral() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: ({
      consultationId,
      input,
    }: {
      consultationId: string;
      input: CreateConsultationReferralInput;
    }) => consultationService.createConsultationReferral(consultationId, input, accessToken!),
  });
}

export function useReferralSpecialties() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['consultation-referral-specialties'],
    queryFn: () => verificationService.listSpecialties(accessToken),
    enabled: Boolean(accessToken),
  });
}

/** Doctors qualified for one target specialty, excluding the referring doctor. */
export function useReferralDoctors(specialtyId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['consultation-referral-doctors', specialtyId],
    queryFn: () =>
      searchService.searchDoctors(
        { specialtyIds: specialtyId ? [specialtyId] : [] },
        accessToken,
      ),
    enabled: Boolean(accessToken && specialtyId),
  });
}
