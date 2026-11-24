import type { OrderConfirmationWindow } from './confirm-receipt';

// --- Orders (Phase W2 in docforum-web, assumed contract against
// docforum-core issue #71 / PRD §8.1.6 — see ARCHITECTURE_ESSENTIALS.md
// "Known assumptions". Endpoints and field names are provisional until
// docforum-core's order-token implementation lands.) -------------------

/** Type of clinical order a doctor can issue. */
export type OrderType = 'prescription' | 'lab_order';

/** Order validity state as reported by docforum-core.
 * - active:      Current, valid — show the scannable QR.
 * - superseded:  A newer order replaced this one — hide the QR, explain.
 * - expired:     Time-limited token has passed its validity window.
 * - fulfilled:   Facility marked the order completed.
 * - cancelled:   Order was cancelled by doctor or patient.
 */
export type OrderStatus = 'active' | 'superseded' | 'expired' | 'fulfilled' | 'cancelled';

/** An individual line item on a lab order or prescription. */
export interface OrderItem {
  /** Human-readable name (e.g. "FBC" or "Amoxicillin 250mg"). */
  name: string;
  /** Directions or instructions (optional). */
  note?: string;
}

/** Full detail of a patient order, as returned by docforum-core's
 * `GET /orders/:id` endpoint. The `token` field is the opaque signed
 * string that encodes into the QR code — never include order details
 * in the QR, only the token itself (issue #25 constraint). */
export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  /** The signed, opaque token that facilities scan. Absent/null for
   * non-active orders (superseded, expired) — the QR must not be shown
   * when token is null. */
  token: string | null;
  items: OrderItem[];
  /** ISO 8601 timestamp of when the order was issued. */
  issuedAt: string;
  /** ISO 8601 expiry timestamp (null if the order has no time limit). */
  expiresAt: string | null;
  /** The doctor who issued the order. */
  doctorName: string; // assumed — not yet in schema.prisma
  /** The facility the patient chose (null if not yet assigned). */
  facilityName: string | null; // assumed — not yet in schema.prisma
  patientProfileId: string;
  /** Confirmation window for fulfilled orders (issue #35). */
  confirmationWindow?: OrderConfirmationWindow | null;
  createdAt: string;
  updatedAt: string;
}
