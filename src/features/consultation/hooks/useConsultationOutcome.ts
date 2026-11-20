import { useMutation } from '@tanstack/react-query';
import * as consultationService from '../../../services/consultation-service';
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
