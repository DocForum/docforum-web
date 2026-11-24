// Supported locales. Adding a locale means:
//   1. add it here,
//   2. add `messages/<locale>.json` (may start as a partial stub — missing
//      keys fall back to the English `defaultMessage` in code),
//   3. run `npm run check:i18n`.
export const SUPPORTED_LOCALES = ['en', 'es'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  es: { native: 'Español', english: 'Spanish' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Match a BCP-47 tag (`es-MX`) to the closest supported locale, else default. */
export function resolveLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const base = input.toLowerCase().split('-')[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}
