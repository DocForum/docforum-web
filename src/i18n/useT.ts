import { useIntl } from 'react-intl';

export type MessageValues = Record<string, string | number | boolean | Date | null | undefined>;

/**
 * `t(id, defaultMessage, values)` — the single way components read copy.
 *
 * `defaultMessage` is the English fallback carried in code, so the UI renders
 * correctly before a lazy locale chunk resolves (and if it fails to load).
 * Interpolation/pluralisation always goes through ICU `values`, never string
 * concatenation.
 */
export function useT() {
  const intl = useIntl();
  return (id: string, defaultMessage: string, values?: MessageValues): string =>
    intl.formatMessage({ id, defaultMessage }, values);
}
