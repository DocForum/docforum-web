import type { MedicationPrescription } from '../../types/models';

// Pure, dependency-free schedule derivation. Everything time-based takes an
// explicit `now` so callers (and tests) fully control the clock — nothing here
// reads `Date.now()`. The one hard rule from the reviewer: an ambiguous or
// free-text frequency is never turned into an invented clock time. Only the
// genuinely unambiguous phrasings recognised below become times.

export type FrequencyParse =
  | { kind: 'interval'; everyHours: number }
  | { kind: 'daily-times'; times: string[] }
  | { kind: 'as_needed' }
  | { kind: 'free_text' };

export type DurationParse =
  | { kind: 'days'; days: number }
  | { kind: 'open_ended' };

// Conventional anchors for time-of-day phrasing. These map words the
// prescriber actually wrote ("twice daily", "every night") to a display slot;
// they are not guesses about unstated times. Courses that give no such cue
// fall through to free_text and are never scheduled.
const ONCE_DAILY = ['08:00'];
const TWICE_DAILY = ['08:00', '20:00'];
const THRICE_DAILY = ['08:00', '14:00', '20:00'];
const QUATER_DAILY = ['06:00', '12:00', '18:00', '21:00'];
const MORNING = '08:00';
const NOON = '13:00';
const EVENING = '19:00';
const NIGHT = '22:00';

export function parseFrequency(frequency: string, _drugName: string): FrequencyParse {
  const raw = frequency.trim().toLowerCase();
  if (!raw) return { kind: 'free_text' };

  // Checked first: any "as needed" reading wins outright, so a phrasing like
  // "1 tablet every 6 hours as needed" is never rescheduled into fixed times.
  if (/(^|[^a-z])(prn|as needed|as required|when needed|when required)([^a-z]|$)/.test(raw)) {
    return { kind: 'as_needed' };
  }

  const compact = raw.replace(/[\s.]/g, '');

  // "every N hours" (and "each N hours"), plus the Latin "q6h" round-the-clock
  // form. Spacing is explicit, so it is safe to space doses across a day.
  const spaced = raw.match(/(?:every|each)\s+(\d+)\s*(?:hours|hour|hrs|hr|h)\b/);
  const latin = compact.match(/^q(\d+)h$/);
  const hours = spaced ? Number(spaced[1]) : latin ? Number(latin[1]) : NaN;
  if (Number.isInteger(hours) && hours > 0 && hours <= 24) {
    return { kind: 'interval', everyHours: hours };
  }

  // Count + daily period. Higher counts tested first so "three times daily"
  // is not swallowed by a looser daily match. A "times" phrasing with no
  // recognised number ("several times a day") is ambiguous, so it stays
  // free_text rather than collapsing to a single invented daily slot.
  if (/\b(daily|per day|a day|every day|each day|in 24 hours?)\b/.test(raw) || /\bq\.?d\.?$/.test(compact)) {
    if (/\b(four times|four|4 times|4x|qid)\b/.test(raw)) return { kind: 'daily-times', times: QUATER_DAILY };
    if (/\b(three times|thrice|three|3 times|3x|tid)\b/.test(raw)) return { kind: 'daily-times', times: THRICE_DAILY };
    if (/\b(twice|two times|two|2 times|2x|bid)\b/.test(raw)) return { kind: 'daily-times', times: TWICE_DAILY };
    if (/\b(once|one time|1 time|1x)\b/.test(raw)) return { kind: 'daily-times', times: ONCE_DAILY };
    if (/\btimes?\b/.test(raw)) return { kind: 'free_text' };
    return { kind: 'daily-times', times: ONCE_DAILY };
  }

  // Time-of-day anchors, optionally combined ("every morning and night").
  // A frequency naming a part of the day implies that slot; one that does not
  // is left as free_text rather than assigned an invented time.
  const anchors: string[] = [];
  if (/\bmorning\b/.test(raw) || /^qm$/.test(compact)) anchors.push(MORNING);
  if (/\bnoon\b/.test(raw)) anchors.push(NOON);
  if (/\bevening\b/.test(raw)) anchors.push(EVENING);
  if (/\bnight\b/.test(raw) || /^qn$/.test(compact)) anchors.push(NIGHT);
  if (anchors.length) {
    return { kind: 'daily-times', times: [...new Set(anchors)].sort() };
  }

  return { kind: 'free_text' };
}

export function parseDuration(duration: string): DurationParse {
  const raw = duration.trim().toLowerCase();
  if (!raw) return { kind: 'open_ended' };
  if (/\b(ongoing|indefinite|continuous|as directed|long.term|open.ended)\b/.test(raw)) {
    return { kind: 'open_ended' };
  }
  const weeks = raw.match(/(\d+)\s*(?:weeks|week|wks|wk|w)\b/);
  if (weeks) return { kind: 'days', days: Number(weeks[1]) * 7 };
  // Months are approximated to 30 days: duration rounding is display-only and
  // never invents a dose time, so this is a safe simplification.
  const months = raw.match(/(\d+)\s*(?:months|month|mo)\b/);
  if (months) return { kind: 'days', days: Number(months[1]) * 30 };
  const days = raw.match(/(\d+)\s*(?:days|day|d)\b/);
  if (days) return { kind: 'days', days: Number(days[1]) };
  return { kind: 'open_ended' };
}

function normalizeDrugName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeOnDay(dayStart: Date, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dayStart);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export interface Course {
  prescriptionId: string;
  itemId: string;
  drugName: string;
  dosage: string;
  frequencyText: string;
  durationText: string;
  doctorName?: string;
  start: Date;
  end: Date | null;
  frequency: FrequencyParse;
  duration: DurationParse;
  scheduled: boolean;
  ended: boolean;
  overlapping: boolean;
}

export interface DoseEntry {
  key: string;
  drugName: string;
  dosage: string;
  time: string;
  startAt: Date;
  frequencyText: string;
}

export interface ScheduleDay {
  dateKey: string;
  label: string;
  date: Date;
  entries: DoseEntry[];
}

export interface UnscheduledItem {
  itemId: string;
  drugName: string;
  dosage: string;
  frequencyText: string;
  durationText: string;
  reason: 'as_needed' | 'free_text';
}

export interface EndedItem {
  itemId: string;
  drugName: string;
  dosage: string;
  frequencyText: string;
  endedOn: string;
}

export interface OverlapWarning {
  drugName: string;
  count: number;
}

export interface MedicationSchedule {
  days: ScheduleDay[];
  today: ScheduleDay | null;
  unscheduled: UnscheduledItem[];
  ended: EndedItem[];
  overlaps: OverlapWarning[];
}

export function buildCourses(prescriptions: MedicationPrescription[], now: Date): Course[] {
  const todayStart = startOfDay(now).getTime();

  const courses: Course[] = [];
  for (const rx of prescriptions) {
    const start = new Date(rx.createdAt);
    if (Number.isNaN(start.getTime())) continue;

    for (const item of rx.items) {
      const frequency = parseFrequency(item.frequency, item.drugName);
      const duration = parseDuration(item.duration);
      const end = duration.kind === 'days' ? addDays(start, duration.days) : null;
      courses.push({
        prescriptionId: rx.id,
        itemId: item.id,
        drugName: item.drugName,
        dosage: item.dosage,
        frequencyText: item.frequency,
        durationText: item.duration,
        doctorName: rx.prescribingDoctorName,
        start,
        end,
        frequency,
        duration,
        scheduled: frequency.kind === 'interval' || frequency.kind === 'daily-times',
        ended: end !== null && end.getTime() < todayStart,
        overlapping: false,
      });
    }
  }

  markOverlaps(courses);
  return courses;
}

// Two active courses of the same drug whose date ranges intersect: the patient
// cannot tell which governs, so both get flagged (the UI asks them to contact
// the prescriber rather than picking one).
function markOverlaps(courses: Course[]): void {
  const active = courses.filter((c) => !c.ended);
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      if (normalizeDrugName(a.drugName) !== normalizeDrugName(b.drugName)) continue;
      const aEnd = a.end ? a.end.getTime() : Infinity;
      const bEnd = b.end ? b.end.getTime() : Infinity;
      if (a.start.getTime() <= bEnd && b.start.getTime() <= aEnd) {
        a.overlapping = true;
        b.overlapping = true;
      }
    }
  }
}

function doseTimesOnDay(course: Course, dayStart: Date): Date[] {
  if (!course.scheduled) return [];
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + 86_400_000;
  const endMs = course.end ? course.end.getTime() : Infinity;

  if (course.frequency.kind === 'daily-times') {
    return course.frequency.times
      .map((t) => timeOnDay(dayStart, t))
      .filter((ms) => ms >= course.start.getTime() && ms >= dayStartMs && ms < dayEndMs && ms <= endMs)
      .map((ms) => new Date(ms))
      .sort((a, b) => a.getTime() - b.getTime());
  }

  if (course.frequency.kind === 'interval') {
    const stepMs = course.frequency.everyHours * 3_600_000;
    const base = course.start.getTime();
    const k = base >= dayStartMs ? 0 : Math.ceil((dayStartMs - base) / stepMs);
    const out: Date[] = [];
    let t = base + k * stepMs;
    let guard = 0;
    while (t < dayEndMs && guard < 100) {
      if (t >= base && t <= endMs) out.push(new Date(t));
      t += stepMs;
      guard += 1;
    }
    return out;
  }

  return [];
}

function dayLabel(dayStart: Date, offset: number): string {
  if (offset === 0) return 'Today';
  const weekday = dayStart.toLocaleDateString('en-US', { weekday: 'short' });
  const day = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday} ${day}`;
}

export function buildMedicationSchedule(
  prescriptions: MedicationPrescription[],
  now: Date,
  horizonDays = 7,
): MedicationSchedule {
  const courses = buildCourses(prescriptions, now);
  const todayStart = startOfDay(now);
  const activeScheduled = courses.filter((c) => c.scheduled && !c.ended);

  const days: ScheduleDay[] = [];
  for (let i = 0; i < horizonDays; i += 1) {
    const dayStart = addDays(todayStart, i);
    const entries: DoseEntry[] = [];
    for (const course of activeScheduled) {
      for (const when of doseTimesOnDay(course, dayStart)) {
        entries.push({
          key: `${course.itemId}:${dateKey(dayStart)}:${formatTime(when)}`,
          drugName: course.drugName,
          dosage: course.dosage,
          time: formatTime(when),
          startAt: when,
          frequencyText: course.frequencyText,
        });
      }
    }
    entries.sort((a, b) => a.time.localeCompare(b.time));
    days.push({ dateKey: dateKey(dayStart), label: dayLabel(dayStart, i), date: dayStart, entries });
  }

  const unscheduled: UnscheduledItem[] = courses
    .filter((c) => !c.scheduled && !c.ended && (c.frequency.kind === 'as_needed' || c.frequency.kind === 'free_text'))
    .map((c) => ({
      itemId: c.itemId,
      drugName: c.drugName,
      dosage: c.dosage,
      frequencyText: c.frequencyText,
      durationText: c.durationText,
      reason: c.frequency.kind === 'as_needed' ? 'as_needed' : 'free_text',
    }));

  const ended: EndedItem[] = courses
    .filter((c) => c.ended)
    .map((c) => ({
      itemId: c.itemId,
      drugName: c.drugName,
      dosage: c.dosage,
      frequencyText: c.frequencyText,
      endedOn: c.end ? c.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    }));

  const overlaps: OverlapWarning[] = [];
  const seen = new Set<string>();
  for (const course of courses) {
    if (!course.overlapping) continue;
    const norm = normalizeDrugName(course.drugName);
    if (seen.has(norm)) continue;
    seen.add(norm);
    overlaps.push({
      drugName: course.drugName,
      count: courses.filter((c) => !c.ended && normalizeDrugName(c.drugName) === norm).length,
    });
  }

  return { days, today: days[0] ?? null, unscheduled, ended, overlaps };
}
