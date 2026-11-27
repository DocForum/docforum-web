// --- Notification centre (issue #107) ---------------------------------------
// Assumed contract: docforum-core#93 (Notification model, provider-agnostic
// dispatch interface and the in-app inbox API) has not landed. The shapes
// follow what that issue asks for and are recorded in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Notification centre".

/** Known notification kinds. The API may add more, so a payload's `kind` is
 * typed as `NotificationKind | string` and unknown values render generically. */
export type NotificationKind =
  | 'appointment_booked'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'referral_created'
  | 'referral_accepted'
  | 'order_issued'
  | 'order_fulfilled'
  | 'order_rejected'
  | 'result_ready'
  | 'payment_due'
  | 'payment_escrowed'
  | 'payment_released'
  | 'payment_refunded'
  | 'message_received'
  | 'dispute_opened'
  | 'dispute_resolved';

/** One in-app notification. PHI-light by design: the title/body are written
 * by docforum-core for display and must never carry clinical detail beyond
 * what the destination screen already shows the recipient. */
export interface Notification {
  id: string;
  kind: NotificationKind | string;
  title: string;
  /** One-line, PHI-light summary. Rendered as text only, never HTML. */
  body: string;
  /** App-relative deep link (`/patient/orders/ord-1`), validated before use;
   * `null` for kinds that have no destination. */
  link: string | null;
  /** `null` while unread. */
  readAt: string | null;
  createdAt: string;
}

/** Cursor-paginated inbox page. `unreadCount` is the server's total for the
 * whole inbox (not this page), so the bell badge is correct before every
 * page has been loaded. */
export interface NotificationPage {
  items: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}

/** Ticket for the live SSE stream. `EventSource` cannot send an Authorization
 * header, so the short-lived ticket — never the access token — travels in the
 * stream URL. */
export interface NotificationStreamTicket {
  /** Opaque, single-use, expires within a minute. */
  ticket: string;
  /** App-relative stream path including the ticket, e.g.
   * `/notifications/stream?ticket=…`. */
  streamPath: string;
  expiresAt: string;
}

/** A live `notification` SSE event's payload. */
export type NotificationStreamEvent =
  | { type: 'notification'; notification: Notification; unreadCount: number }
  | { type: 'read'; notificationIds: string[]; unreadCount: number };
