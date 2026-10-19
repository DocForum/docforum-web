import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as teamService from '../../../services/facility-team-service';
import { useAuthStore } from '../../../store/auth-store';
import type { InviteMemberInput } from '../../../types/models';

export function useFacilityMembers(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'members'],
    queryFn: () => teamService.listFacilityMembers(facilityId, accessToken!),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useFacilityInvites(facilityId: string, isOwner: boolean) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'invites'],
    queryFn: () => teamService.listFacilityInvites(facilityId, accessToken!),
    enabled: Boolean(accessToken && facilityId && isOwner),
  });
}

export function useInviteMember(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      teamService.inviteFacilityMember(facilityId, input, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'invites'] });
    },
  });
}

export function useResendInvite(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      teamService.resendFacilityInvite(facilityId, inviteId, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'invites'] });
    },
  });
}

export function useRevokeInvite(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      teamService.revokeFacilityInvite(facilityId, inviteId, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'invites'] });
    },
  });
}

export function useRemoveMember(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      teamService.removeFacilityMember(facilityId, memberId, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'members'] });
    },
  });
}

export function useFulfillmentQueue(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['facility', facilityId, 'queue'],
    queryFn: () => teamService.getFulfillmentQueue(facilityId, accessToken!),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useUpdateFulfillmentItem(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, action, notes }: { itemId: string; action: 'fulfilled' | 'rejected'; notes?: string }) =>
      teamService.updateFulfillmentItem(facilityId, itemId, action, accessToken!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'queue'] });
    },
  });
}
