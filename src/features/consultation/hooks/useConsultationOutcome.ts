import { useMutation, useQuery } from '@tanstack/react-query';
import * as consultationService from '../../../services/consultation-service';
import * as verificationService from '../../../services/doctor-verification-service';
import * as searchService from '../../../services/search-service';
import { useAuthStore } from '../../../store/auth-store';
import type {
  ConsultationOrderInput,
  CreateConsultationReferralInput,
  RecordConsultationInput,
} from '../../../types/models';

export function useRecordConsultation() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: ({
      appointmentId,
      input,
    }: {
      appointmentId: string;
      input: RecordConsultationInput;
    }) => consultationService.recordConsultation(appointmentId, input, accessToken!),
  });
}

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

export function useIssueConsultationOrder() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: ({
      consultationId,
      input,
    }: {
      consultationId: string;
      input: ConsultationOrderInput;
    }) => consultationService.issueConsultationOrder(consultationId, input, accessToken!),
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

export function useReferralDoctors(specialtyId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['consultation-referral-doctors', specialtyId],
    queryFn: () => searchService.searchDoctors({ specialtyIds: specialtyId ? [specialtyId] : [] }, accessToken),
    enabled: Boolean(accessToken && specialtyId),
  });
}
