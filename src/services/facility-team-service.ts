import { apiFetch } from './api-client';
import type {
  FacilityMember,
  FacilityInvite,
  InviteMemberInput,
  RemoveMemberResponse,
  FulfillmentQueueItem,
} from '../types/models';

export function listFacilityMembers(facilityId: string, accessToken: string, signal?: AbortSignal): Promise<FacilityMember[]> {
  return apiFetch<FacilityMember[]>(`/facilities/${facilityId}/members`, { accessToken, signal });
}

export function listFacilityInvites(facilityId: string, accessToken: string, signal?: AbortSignal): Promise<FacilityInvite[]> {
  return apiFetch<FacilityInvite[]>(`/facilities/${facilityId}/invites`, { accessToken, signal });
}

export function inviteFacilityMember(
  facilityId: string,
  input: InviteMemberInput,
  accessToken: string,
): Promise<FacilityInvite> {
  return apiFetch<FacilityInvite>(`/facilities/${facilityId}/invites`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function resendFacilityInvite(
  facilityId: string,
  inviteId: string,
  accessToken: string,
): Promise<FacilityInvite> {
  return apiFetch<FacilityInvite>(`/facilities/${facilityId}/invites/${inviteId}/resend`, {
    method: 'POST',
    accessToken,
  });
}

export function revokeFacilityInvite(
  facilityId: string,
  inviteId: string,
  accessToken: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/facilities/${facilityId}/invites/${inviteId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function removeFacilityMember(
  facilityId: string,
  memberId: string,
  accessToken: string,
): Promise<RemoveMemberResponse> {
  return apiFetch<RemoveMemberResponse>(`/facilities/${facilityId}/members/${memberId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function getFulfillmentQueue(
  facilityId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<FulfillmentQueueItem[]> {
  return apiFetch<FulfillmentQueueItem[]>(`/facilities/${facilityId}/fulfillment-queue`, {
    accessToken,
    signal,
  });
}

export function updateFulfillmentItem(
  facilityId: string,
  itemId: string,
  action: 'fulfilled' | 'rejected',
  accessToken: string,
  notes?: string,
): Promise<FulfillmentQueueItem> {
  return apiFetch<FulfillmentQueueItem>(`/facilities/${facilityId}/fulfillment-queue/${itemId}/action`, {
    method: 'POST',
    body: { action, notes },
    accessToken,
  });
}
