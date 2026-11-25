export interface MetricsWindow {
  from: string;
  to: string;
  timeZone: string;
}

function parseDateInput(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }
  return [year, month, day];
}

export function metricsWindowFromDates(fromDate: string, throughDate: string): MetricsWindow {
  const start = parseDateInput(fromDate);
  const end = parseDateInput(throughDate);
  if (!start || !end) throw new Error('Choose a valid start and end date.');
  const inclusiveDays =
    (Date.UTC(end[0], end[1], end[2]) - Date.UTC(start[0], start[1], start[2])) / 86_400_000 + 1;
  if (inclusiveDays < 1) throw new Error('The start date must be on or before the end date.');
  if (inclusiveDays > 366) throw new Error('Choose a date range of 366 days or fewer.');

  const from = new Date(start[0], start[1], start[2]);
  const to = new Date(end[0], end[1], end[2] + 1);
  if (to.getTime() - from.getTime() > 366 * 86_400_000) {
    throw new Error('Choose a date range of 366 days or fewer.');
  }
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time zone',
  };
}

export function localDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function defaultMetricsDates(now = new Date()): { from: string; through: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  return { from: localDateInput(from), through: localDateInput(now) };
}
