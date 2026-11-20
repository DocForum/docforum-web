import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText } from './ics';
import type { ScheduleDay } from './schedule';

const NOW = new Date(2026, 3, 15, 8, 0, 0);

function day(entries: ScheduleDay['entries']): ScheduleDay {
  return { dateKey: '2026-04-15', label: 'Today', date: NOW, entries };
}

function dose(key: string, drug: string, dosage: string, time: string) {
  return { key, drugName: drug, dosage, time, startAt: new Date(2026, 3, 15, 8, 0, 0), frequencyText: 'twice daily' };
}

describe('escapeIcsText', () => {
  it('escapes commas, semicolons and backslashes', () => {
    expect(escapeIcsText('a,b;c\\d')).toBe('a\\,b\\;c\\\\d');
  });

  it('escapes newlines as literal \\n', () => {
    expect(escapeIcsText('line1\nline2')).toBe('line1\\nline2');
  });
});

describe('buildIcs', () => {
  it('emits a valid VCALENDAR envelope', () => {
    const ics = buildIcs([day([dose('k1', 'Amoxicillin', '500 mg', '08:00')])]);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('emits one VEVENT per dose', () => {
    const ics = buildIcs([
      day([dose('k1', 'Amoxicillin', '500 mg', '08:00'), dose('k2', 'Amoxicillin', '500 mg', '14:00')]),
    ]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(2);
  });

  it('writes floating local DTSTART/DTEND', () => {
    const ics = buildIcs([day([dose('k1', 'Ibuprofen', '200 mg', '08:00')])]);
    expect(ics).toContain('DTSTART:20260415T080000');
    expect(ics).toContain('DTEND:20260415T081500');
    expect(ics).not.toContain('DTSTART;');
  });

  it('sets SUMMARY to the drug and dosage', () => {
    const ics = buildIcs([day([dose('k1', 'Metformin', '850 mg', '08:00')])]);
    expect(ics).toContain('SUMMARY:Metformin 850 mg');
  });

  it('escapes punctuation in the summary', () => {
    const ics = buildIcs([day([dose('k1', 'Syrup A,B', '5;2 ml', '08:00')])]);
    expect(ics).toContain('SUMMARY:Syrup A\\,B 5\\;2 ml');
  });

  it('contains no URLs and no data beyond the supplied doses', () => {
    const ics = buildIcs([day([dose('k1', 'Amoxicillin', '500 mg', '08:00')])]);
    expect(ics).not.toMatch(/https?:\/\//);
    expect(ics.toLowerCase()).not.toContain('url');
    expect(ics).not.toContain('Dr Okafor');
  });

  it('emits no VEVENT when there are no scheduled doses', () => {
    const ics = buildIcs([day([])]);
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
