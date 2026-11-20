import { useEffect, useState, type ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { useLocaleStore } from '../store/locale-store';
import { loadMessagesWithFallback, type Messages } from './index';
import { DEFAULT_LOCALE } from './locales';

/**
 * Supplies ICU messages for the selected locale.
 *
 * The catalogue is loaded lazily; until it resolves, `IntlProvider` renders
 * with no messages and react-intl falls back to each call's `defaultMessage`
 * (English), so there is never a blank frame or a blocking spinner.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);
  const [messages, setMessages] = useState<Messages>({});

  useEffect(() => {
    let cancelled = false;
    setMessages((current) => (Object.keys(current).length === 0 ? current : {}));

    loadMessagesWithFallback(locale)
      .then((loaded) => {
        if (!cancelled) setMessages(loaded);
      })
      .catch(() => {
        // A failed locale chunk must not take the app down — defaultMessage
        // still renders English.
        if (!cancelled) setMessages({});
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider
      locale={locale}
      defaultLocale={DEFAULT_LOCALE}
      messages={messages}
      // Missing ids intentionally fall back to defaultMessage; the CI check
      // (npm run check:i18n) is what keeps catalogues complete, not runtime
      // warnings in the console.
      onError={() => undefined}
    >
      {children}
    </IntlProvider>
  );
}
