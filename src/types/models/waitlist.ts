// --- Waitlist with time-boxed slot offers (Phase W2 — issue #16) -------------
// ASSUMED contract: docforum-core#57 (waitlist + held slot offers) is not
// merged yet. See ARCHITECTURE_ESSENTIALS.md "Known assumptions".
//
// Every offer carries the server's clock reading (`serverNow`) alongside its
// expiry. Countdowns are anchored to that reading, never to the device clock
// alone: a phone whose clock is minutes fast must not expire an offer early
// (or miss it entirely).

export type WaitlistStatus = 'waiting' | 'offer_pending' | 'booked' | 'expired' | 'left';

/** Preferred time window the patient gives when joining. */
export type PreferredTimeWindow = 'anytime' | 'morning' | 'afternoon' | 'evening';

export interface WaitlistOffer {
  id: string;
  entryId: string;
  doctorName: string;
  specialtyName: string;
  startsAt: string;
  endsAt: string;
  /** When the held slot stops being reserved for this patient. */
  expiresAt: string;
  /** The server's clock at the moment this payload was produced. */
  serverNow: string;
}

export interface WaitlistEntry {
  id: string;
  patientProfileId: string;
  doctorId: string | null;
  doctorName: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  preferredWindow: PreferredTimeWindow;
  status: WaitlistStatus;
  joinedAt: string;
  updatedAt: string;
  /** Present while an offer is open for this entry. */
  offer: WaitlistOffer | null;
}

export interface WaitlistListResult {
  items: WaitlistEntry[];
  /** Server clock for the whole page, used when an entry has no offer yet. */
  serverNow: string;
}

export interface JoinWaitlistInput {
  doctorId?: string | null;
  specialtyId?: string | null;
  preferredWindow: PreferredTimeWindow;
}

export interface UpdateWaitlistInput {
  preferredWindow: PreferredTimeWindow;
  /**
   * The `updatedAt` the patient saw, so a concurrent edit comes back as a
   * `409` instead of silently overwriting someone else's change.
   */
  expectedUpdatedAt: string;
}

export interface AcceptWaitlistOfferResult {
  entry: WaitlistEntry;
  /** The booking created from the held slot. */
  appointmentId: string;
  /** `true` when docforum-core still needs intake before the visit. */
  requiresIntake: boolean;
}

export interface DeclineWaitlistOfferResult {
  entry: WaitlistEntry;
}
