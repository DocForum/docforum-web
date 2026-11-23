import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as consultationService from '../../../services/consultation-service';
import * as prescriptionsService from '../../../services/prescriptions-service';
import * as doctorProfileService from '../../../services/doctor-profile-service';
import { listEligibleFacilities } from '../../../services/facility-service';
import { useAuthStore } from '../../../store/auth-store';
import type {
  Consultation,
  CreateConsultationInput,
  IssueLabOrderInput,
  IssuePrescriptionInput,
  IssuedLabOrder,
  IssuedPrescription,
} from '../../../types/models';

const CONSULTATION_KEY = (appointmentId: string) =>
  ['consultation', 'record', appointmentId] as const;

/**
 * The consultation this visit was closed with. Core exposes no
 * by-appointment read, so this is populated by `useCreateConsultation` in the
 * current session (and cleared with the rest of the query cache otherwise).
 */
export function useConsultationForAppointment(appointmentId: string) {
  return useQuery<Consultation | null>({
    queryKey: CONSULTATION_KEY(appointmentId),
    // Purely cache-backed: no request, no refetch.
    queryFn: () => null,
    initialData: null,
    staleTime: Infinity,
  });
}

export function useCreateConsultation(appointmentId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateConsultationInput, 'appointmentId'>) =>
      consultationService.createConsultation(
        { ...input, appointmentId },
        accessToken!,
      ),
    onSuccess: (consultation) => {
      queryClient.setQueryData(CONSULTATION_KEY(appointmentId), consultation);
    },
  });
}

export function useIssuePrescription() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<
    IssuedPrescription,
    Error,
    { consultationId: string; input: IssuePrescriptionInput }
  >({
    mutationFn: ({ consultationId, input }) =>
      prescriptionsService.issuePrescription(consultationId, input, accessToken!),
    onSuccess: () => {
      // Orders change what the patient owes and what the pharmacy/lab has to
      // fulfil, so related caches go stale immediately.
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-chart'] });
      queryClient.invalidateQueries({ queryKey: ['care-thread'] });
    },
  });
}

export function useIssueLabOrder() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<
    IssuedLabOrder,
    Error,
    { consultationId: string; input: IssueLabOrderInput }
  >({
    mutationFn: ({ consultationId, input }) =>
      prescriptionsService.issueLabOrder(consultationId, input, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-chart'] });
      queryClient.invalidateQueries({ queryKey: ['care-thread'] });
    },
  });
}

export function useMyDoctorProfile() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['doctors', 'me'],
    queryFn: () => doctorProfileService.getMyDoctorProfile(accessToken!),
    enabled: Boolean(accessToken),
    // A missing profile (404) is a valid answer for this screen, not a retry.
    retry: false,
    staleTime: 60_000,
  });
}

export function useEligibleFacilities(type: 'lab' | 'pharmacy') {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['facilities', 'eligible', type],
    queryFn: () => listEligibleFacilities(type, accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 60_000,
  });
}
