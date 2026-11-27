import { createIntl, createIntlCache } from 'react-intl';
import type { Translator } from './useT';

const intl = createIntl({ locale: 'en', defaultLocale: 'en' }, createIntlCache());

export const englishTranslator: Translator = (id, defaultMessage, values) =>
  intl.formatMessage({ id, defaultMessage }, values);
