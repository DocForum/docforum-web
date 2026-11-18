import { useIntl } from 'react-intl';

/**
 * Locale-aware formatting helpers. Use these instead of
 * `toLocaleDateString`/`toFixed` so dates, times, numbers and percentages
 * follow the selected language.
 */
export function useFormatters() {
  const intl = useIntl();

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
  };
}
