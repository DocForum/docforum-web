// Reschedule cutoff — pure, clock-injected, no React and no fetch, so every
// boundary is testable without a DOM (see cutoff.test.ts).
//
// The window value is an ASSUMPTION: docforum-core#55 asks for "a configurable
// cutoff (e.g. no reschedule within 2h of start)" and its policy sibling
// docforum-core#56 is still open, so the server neither enforces nor reports a
// value yet. This is the client-side gate until it does; if the server
// disagrees at request time it answers with its own status/message, which the
// dialog surfaces verbatim rather than overriding this window with a guess.
import type { Appointment } from '../../types/models';

export const RESCHEDULE_CUTOFF_MS = 2 * 60 * 60 * 1000;

export interface RescheduleWindow {
  /** True only when this appointment can be moved right now. */
  allowed: boolean;
  /** Why it cannot be moved — non-null exactly when `allowed` is false. */
  blockedReason: string | null;
  /** ISO instant the window closes (start − cutoff), when the time is known. */
  closesAt: string | null;
}

const STATUS_REASON: Record<Appointment['status'], string> = {
  scheduled: '',
  completed: 'This appointment is complete, so it can no longer be moved.',
  cancelled: 'This appointment was cancelled, so there is nothing left to move.',
  no_show: 'This appointment was marked as a no-show, so it can no longer be moved.',
};

/**
 * `now` is a parameter, never read from the clock inside, so the boundary
 * (exactly 2h out) is a case a test can pin down rather than approximate.
 */
export function rescheduleWindow(appointment: Appointment, now: Date): RescheduleWindow {
  if (appointment.status !== 'scheduled') {
    return { allowed: false, blockedReason: STATUS_REASON[appointment.status], closesAt: null };
  }

  const startMs = Date.parse(appointment.availabilitySlot.startTime);
  if (Number.isNaN(startMs)) {
    // Fail closed: an appointment whose time cannot be read must not be
    // offered a destructive action on a guess.
    return {
      allowed: false,
      blockedReason: "This appointment's time can't be read right now, so it can't be moved.",
      closesAt: null,
    };
  }

  const closesAt = new Date(startMs - RESCHEDULE_CUTOFF_MS);
  const remainingMs = startMs - now.getTime();

  if (remainingMs <= 0) {
    return {
      allowed: false,
      blockedReason: "This appointment's start time has passed, so it can't be rescheduled.",
      closesAt: closesAt.toISOString(),
    };
  }

  if (remainingMs <= RESCHEDULE_CUTOFF_MS) {
    return {
      allowed: false,
      blockedReason: `Rescheduling closes 2 hours before your appointment. This one starts in ${formatDuration(
        remainingMs,
      )}.`,
      closesAt: closesAt.toISOString(),
    };
  }

  return { allowed: true, blockedReason: null, closesAt: closesAt.toISOString() };
}

/** "47 minutes" / "2 hours" / "2 hours 5 minutes" / "1 day 3 hours".
 * Deliberately not locale-formatted: it is embedded in English UI copy. */
export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));

  if (totalMinutes < 1) return 'under a minute';
  if (totalMinutes === 1) return 'a minute';
  if (totalMinutes < 60) return `${totalMinutes} minutes`;

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const dayPart = days === 1 ? '1 day' : `${days} days`;
    return hours === 0 ? dayPart : `${dayPart} ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  const hourPart = totalHours === 1 ? '1 hour' : `${totalHours} hours`;
  return minutes === 0 ? hourPart : `${hourPart} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
