import { useMemo } from 'react';
import { createFormatters, type Formatters } from './format';
import { useLocaleStore } from '../store/locale-store';

/**
 * Formatters bound to the active locale/time zone. Components use this
 * rather than importing `toLocale*` directly so changing the locale
 * re-renders every formatted value consistently (issue #88).
 */
export function useFormat(): Formatters {
  const formattingLocale = useLocaleStore((state) => state.formattingLocale);
  return useMemo(() => createFormatters(formattingLocale), [formattingLocale]);
}
