import { useContext } from 'react';
import { IntlContext } from 'react-intl';
import type { MessageValues } from './useT';

/**
 * `useT` for shared form controls (DatePicker, TimePicker — issue #114) that
 * must also render where no IntlProvider is mounted (isolated component
 * tests, stories, early boot). With a provider it is exactly `useT`; without
 * one it returns the English default with `{values}` filled in, and the
 * locale falls back to `en`.
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
  return {
    locale: 'en',
    t: (_id, defaultMessage, values) =>
      defaultMessage.replace(/\{(\w+)\}/g, (match, key: string) =>
        values && values[key] !== undefined && values[key] !== null ? String(values[key]) : match,
      ),
  };
}
