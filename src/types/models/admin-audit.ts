import type { Role } from './core';

// --- Phase W6 — Admin audit & access logs (issue #71) -----------------------
// AuditEvent is real: mirrors docforum-core's `AuditEvent` model and
// `GET /admin/audit-events` (docforum-core#43, see its docs/api/README.md).
// AccessLog is assumed — docforum-core#45 hasn't landed; see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

/** One page of a keyset-paginated admin listing. `nextCursor` is opaque —
 * pass it back as `cursor`; `null` means this is the last page. */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuditEvent {
  id: string;
  // Null only for system-initiated transitions.
  actorUserId: string | null;
  actorRole: Role | null;
  // e.g. 'Appointment', 'DoctorProfile', 'PaymentIntent'.
  entityType: string;
  entityId: string;
  // e.g. 'appointment.booked', 'payment_intent.released'.
  action: string;
  fromState: string | null;
  toState: string | null;
  requestId: string | null;
  // Small flat map of ids/codes — never personal data (server-enforced).
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  actorUserId: string | null;
  actorRole: Role | null;
  entityType: string;
  entityId: string;
  // The API route that returned the PHI-bearing payload.
  route: string;
  createdAt: string;
}
