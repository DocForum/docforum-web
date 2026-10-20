import type { PatientAppointment } from '../../types/models';

const DAY_MS = 24 * 60 * 60 * 1000;

function slotStart(appointment: PatientAppointment): number {
  return new Date(appointment.availabilitySlot.startTime).getTime();
}

/** Slot times come from Postgres as instants; a visit "on the day" is about
 * the local calendar day the patient is living, not a UTC midnight. */
function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function isOnSlotDay(appointment: PatientAppointment, now: Date): boolean {
  const start = slotStart(appointment);
  return !Number.isNaN(start) && isSameLocalDay(start, now.getTime());
}

/** Live updates only make sense for a visit that is happening today and has
 * not already been settled — a past or cancelled appointment must not keep
 * a poll running. */
export function shouldPollQueue(appointment: PatientAppointment, now: Date): boolean {
  return appointment.status === 'scheduled' && isOnSlotDay(appointment, now);
}

/** The hub shows a visit while it is still ahead of you (or happening today);
 * anything older drops out on its own without a server-side filter. */
export function isUpcoming(appointment: PatientAppointment, now: Date): boolean {
  const start = slotStart(appointment);
  if (Number.isNaN(start)) return false;
  return appointment.status === 'scheduled' && (start >= now.getTime() || isSameLocalDay(start, now.getTime()));
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatSlotTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatSlotDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (isSameLocalDay(date.getTime(), now.getTime())) return 'today';
  const tomorrow = new Date(now.getTime() + DAY_MS);
  if (isSameLocalDay(date.getTime(), tomorrow.getTime())) return 'tomorrow';
  return date.toLocaleDateString();
}
