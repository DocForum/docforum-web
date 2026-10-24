// Availability manager calls to docforum-core.
//
// REAL (docforum-core's docs/api/README.md):
//   POST /availability/doctors/:doctorProfileId/slots/generate — fixed-length,
//     single-day, idempotent for overlapping ranges; core has no recurrence
//     engine (its ARCHITECTURE.md §6.3.6), so a date range is N calls made
//     here, one per day.
//
// ASSUMED (docforum-core#53 is not landed) — `GET /doctors/me/slots`,
// `POST /doctors/me/slots/block`, `DELETE /availability/slots/:slotId` and
// `POST /availability/slots/:slotId/unblock`. Note the read in particular:
// core's public `GET /availability/doctors/:id/slots` only returns open future
// slots, so it cannot drive a manager view that has to show held and booked
// time, and there is no slot-level write route at all yet. Reconcile all four
// against the real contract when #53 lands.
import { apiFetch } from './api-client';
import type {
  AvailabilitySlot,
  BlockRangeInput,
  BlockRangeResult,
  SlotGenerationInput,
  SlotGenerationResult,
} from '../types/models';

/** ASSUMED: every status, past slots included, each booked slot carrying its
 * `appointment` so a blocked range can name what it would affect. The route
 * infers the doctor from the token; `doctorProfileId` stays in the signature so
 * callers read the same way as the generate call above. */
export function listMySlots(
  _doctorProfileId: string,
  from: string,
  to: string,
  accessToken: string,
): Promise<AvailabilitySlot[]> {
  return apiFetch<AvailabilitySlot[]>(`/doctors/me/slots?from=${from}&to=${to}`, { accessToken });
}

export function generateSlots(
  doctorProfileId: string,
  input: SlotGenerationInput,
  accessToken: string,
): Promise<SlotGenerationResult> {
  return apiFetch<SlotGenerationResult>(`/availability/doctors/${doctorProfileId}/slots/generate`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** ASSUMED: blocks every slot in the range and reports the booked ones it
 * deliberately left alone rather than cancelling them. A `409` with
 * `{ message }` means the whole range was unblockable. */
export function blockSlotRange(input: BlockRangeInput, accessToken: string): Promise<BlockRangeResult> {
  return apiFetch<BlockRangeResult>('/doctors/me/slots/block', { method: 'POST', body: input, accessToken });
}

/** `409` when the slot stopped being open while the doctor was deciding. */
export function removeSlot(slotId: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/availability/slots/${slotId}`, { method: 'DELETE', accessToken });
}

export function unblockSlot(slotId: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/availability/slots/${slotId}/unblock`, { method: 'POST', accessToken });
}
