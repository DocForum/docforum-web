import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as verificationService from '../../../services/doctor-verification-service';
import { invalidateApplication } from './useVerification';
import { useAuthStore } from '../../../store/auth-store';
import type { DoctorSpecialtyClaim } from '../../../types/models';

export function useCreateSpecialtyClaim() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<DoctorSpecialtyClaim, Error, { specialtyId: string }>({
    mutationFn: ({ specialtyId }) => verificationService.createSpecialtyClaim(specialtyId, accessToken!),
    onSuccess: () => invalidateApplication(queryClient),
  });
}

export function useDeleteSpecialtyClaim() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<void, Error, { claimId: string }>({
    mutationFn: ({ claimId }) => verificationService.deleteSpecialtyClaim(claimId, accessToken!),
    onSuccess: () => invalidateApplication(queryClient),
  });
}

/** Re-queue a rejected claim for review; the certificate behind it lives in
 * the credential list, so there is no file to resend here. */
export function useResubmitSpecialtyClaim() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<DoctorSpecialtyClaim, Error, { claimId: string }>({
    mutationFn: ({ claimId }) => verificationService.resubmitSpecialtyClaim(claimId, accessToken!),
    onSuccess: () => invalidateApplication(queryClient),
  });
}
