import { useContext } from 'react';
import { IntlContext, createIntl, createIntlCache } from 'react-intl';

export type MessageValues = Record<string, string | number | boolean | Date | null | undefined>;

/**
 * The translator signature `useT` returns. Pure helpers (status, format and
 * error copy) take one of these as an optional last argument so they can stay
 * usable without React while their callers render through the catalogue.
 */
export type Translate = (id: string, defaultMessage: string, values?: MessageValues) => string;

const cache = createIntlCache();
const english = createIntl({ locale: 'en', messages: {} }, cache);

/**
 * English fallback used by pure logic, tests and any component rendered
 * without an `IntlProvider`. ICU syntax is still parsed, so plurals/selects in
 * a `defaultMessage` render correctly instead of showing their braces.
 */
export const identityTranslate: Translate = (_id, defaultMessage, values) => {
  try {
    return english.formatMessage({ id: _id, defaultMessage }, values);
  } catch {
    return defaultMessage;
  }
};

/**
 * `t(id, defaultMessage, values)` — the single way components read copy.
 *
 * `defaultMessage` is the English fallback carried in code, so the UI renders
 * correctly before a lazy locale chunk resolves (and if it fails to load).
 * Interpolation/pluralisation always goes through ICU `values`, never string
 * concatenation.
 *
 * A missing provider falls back to the English default rather than throwing:
 * the app always mounts `I18nProvider`, and isolated component tests that
 * only exercise behaviour should not have to wrap every tree.
 */
export function useT(): Translate {
  const intl = useContext(IntlContext);
  if (!intl) return identityTranslate;
  return (id: string, defaultMessage: string, values?: MessageValues): string =>
    intl.formatMessage({ id, defaultMessage }, values);
}

/** Active locale, or English when no provider is mounted (isolated tests). */
export function useLocale(): string {
  const intl = useContext(IntlContext);
  return intl?.locale ?? 'en';
}
