import { describe, expect, it } from 'vitest';
import { csvFilename, escapeCsvCell, toCsv } from './csv';
import { entityRecordPath } from './entity-links';

describe('audit CSV export', () => {
  it('leaves plain values alone and blanks null/undefined', () => {
    expect(escapeCsvCell('appointment.booked')).toBe('appointment.booked');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('quotes cells containing commas, quotes, newlines or edge whitespace', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(escapeCsvCell(' padded')).toBe('" padded"');
  });

  it('neutralises spreadsheet formulas (CSV injection)', () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('-1')).toBe("'-1");
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('writes a header row and CRLF-terminated rows', () => {
    const csv = toCsv(
      [
        { header: 'id', value: (row: { id: string; note: string | null }) => row.id },
        { header: 'note', value: (row) => row.note },
      ],
      [
        { id: 'e1', note: 'x,y' },
        { id: 'e2', note: null },
      ],
    );
    expect(csv).toBe('id,note\r\ne1,"x,y"\r\ne2,\r\n');
  });

  it('writes only the header for an empty page', () => {
    expect(toCsv([{ header: 'id', value: (row: { id: string }) => row.id }], [])).toBe('id\r\n');
  });

  it('builds a filesystem-safe timestamped filename', () => {
    expect(csvFilename('docforum-audit-events', new Date('2026-10-18T09:30:05.123Z'))).toBe(
      'docforum-audit-events-2026-10-18T09-30-05Z.csv',
    );
  });
});

describe('audit entity links', () => {
  it('links payment intents to the admin payments console', () => {
    expect(entityRecordPath('PaymentIntent', 'pi 1')).toBe('/admin?intent=pi%201');
  });

  it('returns null for types with no admin view, including prototype keys', () => {
    expect(entityRecordPath('Appointment', 'a1')).toBeNull();
    expect(entityRecordPath('constructor', 'a1')).toBeNull();
    expect(entityRecordPath('__proto__', 'a1')).toBeNull();
  });
});
