import { LOCALE_META, SUPPORTED_LOCALES, type AppLocale } from './format';
import { useLocaleStore } from './locale-store';
import styles from './LocaleSwitcher.module.css';

/**
 * Visible locale switch used to verify formatting and RTL mirroring.
 * A full i18n framework is a separate issue; this control only changes how
 * dates/numbers/amounts are formatted and which writing direction the
 * layout uses.
 */
export function LocaleSwitcher() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <label className={styles.root}>
      <span className={styles.label}>Locale</span>
      <select
        className={styles.select}
        value={locale}
        onChange={(event) => setLocale(event.target.value as AppLocale)}
      >
        {SUPPORTED_LOCALES.map((value) => (
          <option key={value} value={value}>
            {LOCALE_META[value].label} ({LOCALE_META[value].example})
          </option>
        ))}
      </select>
    </label>
  );
}
