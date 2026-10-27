import type { ScheduleDay } from './schedule';

// Client-side ICS (VCALENDAR 2.0). Generated entirely from the loaded
// prescriptions already in memory — nothing is sent anywhere and no URLs are
// ever written into the file.

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// Local-floating timestamps (no `Z`, no TZID): every event uses the same
// wall-clock convention, so doses land at the displayed time in the user's
// own timezone regardless of where the file is opened.
function icsTimestamp(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

function fold(line: string): string {
  // RFC 5545 wants lines <=75 octets; long drug/dose text is wrapped with a
  // leading space on continuation lines so importers rejoin them correctly.
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

const DOSE_WINDOW_MINUTES = 15;

export function buildIcs(days: ScheduleDay[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//docforum//Medication schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const day of days) {
    for (const entry of day.entries) {
      const end = new Date(entry.startAt.getTime() + DOSE_WINDOW_MINUTES * 60_000);
      lines.push(
        'BEGIN:VEVENT',
        `UID:${escapeIcsText(entry.key)}@docforum-medication-schedule`,
        `DTSTAMP:${icsTimestamp(entry.startAt)}`,
        `DTSTART:${icsTimestamp(entry.startAt)}`,
        `DTEND:${icsTimestamp(end)}`,
        `SUMMARY:${escapeIcsText(`${entry.drugName} ${entry.dosage}`.trim())}`,
        `DESCRIPTION:${escapeIcsText(`Take ${entry.drugName} as prescribed. Follow your prescriber's instructions.`)}`,
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}

export function downloadIcs(content: string, filename = 'medication-schedule.ics'): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (typeof window.URL?.createObjectURL !== 'function') return;

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
