// Waitlist calls to docforum-core (issue #16).
//
// ASSUMED contract — docforum-core#57 (waitlist with time-boxed offers) is
// not merged yet. See ARCHITECTURE_ESSENTIALS.md "Known assumptions".
//
//   GET    /patients/me/waitlist               -> WaitlistListResult
//   POST   /patients/me/waitlist               -> WaitlistEntry
//   PATCH  /patients/me/waitlist/:id           -> WaitlistEntry
//   DELETE /patients/me/waitlist/:id           -> void
//   POST   /waitlist/offers/:offerId/accept    -> AcceptWaitlistOfferResult
//   POST   /waitlist/offers/:offerId/decline   -> DeclineWaitlistOfferResult
//
// `serverNow` on the list and on every offer is the only clock the countdown
// trusts. Accept answers 409 when the hold already lapsed (the slot went to
// the next person) — the UI drops the offer and keeps the entry on the list.
import { apiFetch } from './api-client';
import type {
  AcceptWaitlistOfferResult,
  DeclineWaitlistOfferResult,
  JoinWaitlistInput,
  UpdateWaitlistInput,
  WaitlistEntry,
  WaitlistListResult,
} from '../types/models';

export function listMyWaitlist(accessToken: string, signal?: AbortSignal): Promise<WaitlistListResult> {
  return apiFetch<WaitlistListResult>('/patients/me/waitlist', { accessToken, signal });
}

export function joinWaitlist(input: JoinWaitlistInput, accessToken: string): Promise<WaitlistEntry> {
  return apiFetch<WaitlistEntry>('/patients/me/waitlist', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function updateWaitlistEntry(
  entryId: string,
  input: UpdateWaitlistInput,
  accessToken: string,
): Promise<WaitlistEntry> {
  return apiFetch<WaitlistEntry>(`/patients/me/waitlist/${entryId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

export function leaveWaitlist(entryId: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/patients/me/waitlist/${entryId}`, { method: 'DELETE', accessToken });
}

export function acceptWaitlistOffer(
  offerId: string,
  accessToken: string,
): Promise<AcceptWaitlistOfferResult> {
  return apiFetch<AcceptWaitlistOfferResult>(`/waitlist/offers/${offerId}/accept`, {
    method: 'POST',
    accessToken,
  });
}

export function declineWaitlistOffer(
  offerId: string,
  accessToken: string,
): Promise<DeclineWaitlistOfferResult> {
  return apiFetch<DeclineWaitlistOfferResult>(`/waitlist/offers/${offerId}/decline`, {
    method: 'POST',
    accessToken,
  });
}
