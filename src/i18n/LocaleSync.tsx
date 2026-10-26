import { useEffect } from 'react';
import { directionFor } from './format';
import { useLocaleStore } from './locale-store';

/**
 * Keeps `<html lang>`/`<html dir>` in sync with the active locale. Rendered
 * once at the app root. Everything else styles with logical properties
 * (`margin-inline-start`, `inset-inline`, `text-align: start`), so the
 * whole layout mirrors without a second stylesheet.
 */
export function LocaleSync() {
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = directionFor(locale);
  }, [locale]);

  return null;
}
