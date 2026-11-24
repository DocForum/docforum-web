import { useIntl } from 'react-intl';

/**
 * Locale-aware formatting helpers. Use these instead of
 * `toLocaleDateString`/`toFixed` so dates, times, numbers and percentages
 * follow the selected language.
 */
export function useFormatters() {
  const intl = useIntl();
  const dateUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];

  return {
    date: (value: string | number | Date, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
      intl.formatDate(value, options),
    dateTime: (value: string | number | Date, options: Intl.DateTimeFormatOptions = {
      dateStyle: 'medium',
      timeStyle: 'short',
    }) => intl.formatDate(value, options),
    time: (value: string | number | Date, options: Intl.DateTimeFormatOptions = { timeStyle: 'short' }) =>
      intl.formatDate(value, options),
    number: (value: number, options?: Intl.NumberFormatOptions) => intl.formatNumber(value, options),
    percent: (value: number, options: Intl.NumberFormatOptions = { maximumFractionDigits: 1 }) =>
      intl.formatNumber(value / 100, { style: 'percent', ...options }),
    list: (values: string[]) => intl.formatList(values, { type: 'conjunction' }),
    relativeTime: (value: string | Date, now: Date = new Date()) => {
      const date = value instanceof Date ? value : new Date(value);
      if (!Number.isFinite(date.getTime())) return '—';
      const diff = date.getTime() - now.getTime();
      const abs = Math.abs(diff);
      for (const [unit, size] of dateUnits) {
        if (abs >= size) return intl.formatRelativeTime(Math.round(diff / size), unit, { numeric: 'auto' });
      }
      return intl.formatRelativeTime(Math.round(diff / 1000), 'second', { numeric: 'auto' });
    },
  };
}
