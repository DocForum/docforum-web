// --- Live visit queue (#32) --------------------------------------------------
// assumed — docforum-core has no queue endpoint yet; the shape is the smallest
// one that can distinguish "no queue published" from "you are first".

export type QueuePhase = 'not_open' | 'waiting' | 'being_seen' | 'completed';

export interface AppointmentQueue {
  appointmentId: string;
  phase: QueuePhase;
  /** Patients still ahead. null means no queue is published yet — which is
   * not the same as being first. */
  peopleAhead: number | null;
  /** Minutes. Always rendered as an estimate. */
  estimatedWaitMinutes: number | null;
  /** null = this backend has no check-in window, so the UI says "check in on
   * the day" instead of inventing an opening time. */
  checkInOpensAt: string | null;
  checkedInAt: string | null;
}
