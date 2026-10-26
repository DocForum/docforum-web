import { useIntl } from 'react-intl';
import { LOCALE_LABELS, SUPPORTED_LOCALES, isLocale } from '../i18n/locales';
import { useLocaleStore } from '../store/locale-store';
import styles from './LanguageSwitcher.module.css';

/**
 * Language preference control. The choice is held in memory only (see
 * locale-store.ts) until docforum-core exposes a `locale` field on the user.
 */
export function LanguageSwitcher() {
  const intl = useIntl();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <label className={styles.wrapper}>
      <span className={styles.icon} aria-hidden="true">
        {/* Globe glyph, decorative */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1.75 8h12.5M8 1.75c1.8 1.9 2.7 4 2.7 6.25S9.8 12.35 8 14.25C6.2 12.35 5.3 10.25 5.3 8S6.2 3.65 8 1.75Z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </span>
      <span className={styles.srOnly}>
        {intl.formatMessage({ id: 'i18n.language', defaultMessage: 'Language' })}
      </span>
      <select
        className={styles.select}
        value={locale}
        aria-label={intl.formatMessage({ id: 'i18n.language', defaultMessage: 'Language' })}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
      >
        {SUPPORTED_LOCALES.map((value) => (
          <option key={value} value={value}>
            {LOCALE_LABELS[value].native}
          </option>
        ))}
      </select>
    </label>
  );
}
