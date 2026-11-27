import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as waitlistService from '../../../services/waitlist-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import type {
  AcceptWaitlistOfferResult,
  JoinWaitlistInput,
  UpdateWaitlistInput,
} from '../../../types/models';

export function waitlistKey(patientProfileId: string | null) {
  return ['patient', 'waitlist', patientProfileId ?? 'me'] as const;
}

/** The patient's waitlist entries, scoped by acting-for profile. */
export function useWaitlist() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedProfileId = useProfileStore((state) => state.selectedProfileId);

  return useQuery({
    queryKey: waitlistKey(selectedProfileId),
    queryFn: ({ signal }) => waitlistService.listMyWaitlist(accessToken!, signal),
    enabled: Boolean(accessToken),
    // Offers are time-boxed; a stale page would show a countdown for an offer
    // that already lapsed on the server.
    refetchOnWindowFocus: true,
  });
}

function useInvalidateWaitlist() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['patient', 'waitlist'] });
  };
}

export function useJoinWaitlist() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const invalidate = useInvalidateWaitlist();

  return useMutation({
    mutationFn: (input: JoinWaitlistInput) => waitlistService.joinWaitlist(input, accessToken!),
    onSuccess: invalidate,
  });
}

export function useUpdateWaitlistEntry() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const invalidate = useInvalidateWaitlist();

  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: UpdateWaitlistInput }) =>
      waitlistService.updateWaitlistEntry(entryId, input, accessToken!),
    onSuccess: invalidate,
  });
}

export function useLeaveWaitlist() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const invalidate = useInvalidateWaitlist();

  return useMutation({
    mutationFn: (entryId: string) => waitlistService.leaveWaitlist(entryId, accessToken!),
    onSuccess: invalidate,
  });
}

export interface OfferAcceptance {
  offerId: string;
  result: AcceptWaitlistOfferResult;
}

export function useAcceptWaitlistOffer() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation<OfferAcceptance, unknown, string>({
    mutationFn: async (offerId) => ({
      offerId,
      result: await waitlistService.acceptWaitlistOffer(offerId, accessToken!),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient', 'waitlist'] });
      // Accepting creates an appointment.
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useDeclineWaitlistOffer() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const invalidate = useInvalidateWaitlist();

  return useMutation({
    mutationFn: (offerId: string) => waitlistService.declineWaitlistOffer(offerId, accessToken!),
    onSuccess: invalidate,
  });
}
