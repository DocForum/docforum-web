import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export function listFacilityMembers(
  facilityId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Schemas['FacilityMember'][]> {
  return api.facilityTeam.listMembers(facilityId, { accessToken, signal });
}

export function listFacilityInvites(
  facilityId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Schemas['FacilityInvite'][]> {
  return api.facilityTeam.listInvites(facilityId, { accessToken, signal });
}

export function inviteFacilityMember(
  facilityId: string,
  input: Schemas['InviteMemberInput'],
  accessToken: string,
): Promise<Schemas['FacilityInvite']> {
  return api.facilityTeam.inviteMember(facilityId, input, { accessToken });
}

export function resendFacilityInvite(
  facilityId: string,
  inviteId: string,
  accessToken: string,
): Promise<Schemas['FacilityInvite']> {
  return api.facilityTeam.resendInvite(facilityId, inviteId, { accessToken });
}

export function revokeFacilityInvite(
  facilityId: string,
  inviteId: string,
  accessToken: string,
): Promise<{ success: boolean }> {
  return api.facilityTeam.revokeInvite(facilityId, inviteId, { accessToken });
}

export function removeFacilityMember(
  facilityId: string,
  memberId: string,
  accessToken: string,
): Promise<Schemas['RemoveMemberResponse']> {
  return api.facilityTeam.removeMember(facilityId, memberId, { accessToken });
}

export function getFulfillmentQueue(
  facilityId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Schemas['FulfillmentQueueItem'][]> {
  return api.facilityTeam.getFulfillmentQueue(facilityId, { accessToken, signal });
}

export function updateFulfillmentItem(
  facilityId: string,
  itemId: string,
  action: 'fulfilled' | 'rejected',
  accessToken: string,
  notes?: string,
): Promise<Schemas['FulfillmentQueueItem']> {
  return api.facilityTeam.updateFulfillmentItem(facilityId, itemId, { action, notes }, { accessToken });
}
