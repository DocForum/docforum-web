// Client-side CSV export of whatever page the admin is looking at. Never
// fetches more data — the export is exactly the rows already on screen.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

// Spreadsheet apps evaluate cells starting with these as formulas. Audit
// rows carry server data (ids, codes, routes), but an entity id or route
// is still not ours to trust once it lands in Excel (CSV injection).
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || text !== text.trim()) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** RFC 4180-style CSV: CRLF line endings, quoted only where needed. */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [columns.map((column) => escapeCsvCell(column.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvCell(column.value(row))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

/** Timestamped, filesystem-safe name, e.g. `docforum-audit-events-2026-10-18T09-30-00Z.csv`. */
export function csvFilename(prefix: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
  return `${prefix}-${stamp}.csv`;
}

export function downloadCsv(filename: string, csv: string): void {
  // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
