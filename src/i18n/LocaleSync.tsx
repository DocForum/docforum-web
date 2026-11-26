import { useEffect } from 'react';
import { useLocaleStore } from '../store/locale-store';

/**
 * Keeps `<html lang>`/`<html dir>` in sync with the active locale. Rendered
 * once at the app root. Everything else styles with logical properties * (`margin-inline-start`, `inset-inline`, `text-align: start`), so the * whole layout mirrors without a second stylesheet.
 */
export function LocaleSync() {
  const { formattingLocale, currentDirection } = useLocaleStore();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = formattingLocale;
    root.dir = currentDirection();
  }, [formattingLocale]);

  return null;
}
