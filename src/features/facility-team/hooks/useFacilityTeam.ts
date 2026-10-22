import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as teamService from '../../../services/facility-team-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { facilityKeys } from '../../../query-keys';
import type { InviteMemberInput } from '../../../types/models';

export function useFacilityMembers(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: facilityKeys.members(facilityId),
    queryFn: ({ signal }) => teamService.listFacilityMembers(facilityId, accessToken!, signal),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useFacilityInvites(facilityId: string, isOwner: boolean) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: facilityKeys.invites(facilityId),
    queryFn: ({ signal }) => teamService.listFacilityInvites(facilityId, accessToken!, signal),
    enabled: Boolean(accessToken && facilityId && isOwner),
  });
}

export function useInviteMember(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      teamService.inviteFacilityMember(facilityId, input, accessToken!),
    onSuccess: () => { void invalidateFor(queryClient, 'facility.invite-write', facilityId); },
  });
}

export function useResendInvite(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      teamService.resendFacilityInvite(facilityId, inviteId, accessToken!),
    onSuccess: () => { void invalidateFor(queryClient, 'facility.invite-write', facilityId); },
  });
}

export function useRevokeInvite(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      teamService.revokeFacilityInvite(facilityId, inviteId, accessToken!),
    onSuccess: () => { void invalidateFor(queryClient, 'facility.invite-write', facilityId); },
  });
}

export function useRemoveMember(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      teamService.removeFacilityMember(facilityId, memberId, accessToken!),
    onSuccess: () => { void invalidateFor(queryClient, 'facility.member-removed', facilityId); },
  });
}

export function useFulfillmentQueue(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: facilityKeys.queue(facilityId),
    queryFn: ({ signal }) => teamService.getFulfillmentQueue(facilityId, accessToken!, signal),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useUpdateFulfillmentItem(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, action, notes }: { itemId: string; action: 'fulfilled' | 'rejected'; notes?: string }) =>
      teamService.updateFulfillmentItem(facilityId, itemId, action, accessToken!, notes),
    onSuccess: () => { void invalidateFor(queryClient, 'facility.fulfillment-action', facilityId); },
  });
}
