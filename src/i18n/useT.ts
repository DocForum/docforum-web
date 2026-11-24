import { createIntl, createIntlCache, useIntl } from 'react-intl';

export type MessageValues = Record<string, string | number | boolean | Date | null | undefined>;
export type Translator = (id: string, defaultMessage: string, values?: MessageValues) => string;

/** The shape returned by `useT`, so pure helpers can accept a translator
 * without ever hard-coding a message id of their own. */
export type Translate = (id: string, defaultMessage: string, values?: MessageValues) => string;

const fallbackIntl = createIntl({ locale: 'en', messages: {} }, createIntlCache());

/**
 * Translator for pure helpers called outside an `IntlProvider` (unit tests,
 * non-React modules). It renders the English `defaultMessage`, including ICU
 * plurals and values, so callers keep their English behaviour by default.
 */
export const plainTranslate: Translate = (id, defaultMessage, values) =>
  fallbackIntl.formatMessage({ id, defaultMessage }, values);

/**
 * `t(id, defaultMessage, values)` — the single way components read copy.
 *
 * `defaultMessage` is the English fallback carried in code, so the UI renders
 * correctly before a lazy locale chunk resolves (and if it fails to load).
 * Interpolation/pluralisation always goes through ICU `values`, never string
 * concatenation.
 */
export function useT(): Translator {
  const intl = useIntl();
  return (id: string, defaultMessage: string, values?: MessageValues): string =>
    intl.formatMessage({ id, defaultMessage }, values);
}
