import { useContext } from 'react';
import { IntlContext } from 'react-intl';
import { englishTranslator } from './englishTranslator';
import type { MessageValues } from './useT';

/**
 * `useT` for shared form controls (DatePicker, TimePicker — issue #114) and
 * for feature components whose isolated tests render without a provider.
 * With a provider it is exactly `useT`; without one it renders the English
 * `defaultMessage` through react-intl's own formatter, so ICU plurals and
 * `{values}` behave the same as in the app (only the catalogue is missing).
 */
export function useOptionalT(): {
  locale: string;
  t: (id: string, defaultMessage: string, values?: MessageValues) => string;
} {
  const intl = useContext(IntlContext);
  if (intl) {
    return {
      locale: intl.locale,
      t: (id, defaultMessage, values) => intl.formatMessage({ id, defaultMessage }, values),
    };
  }
  return { locale: 'en', t: englishTranslator };
}
