import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

export type Messages = Record<string, string>;
export type MessageLoaders = Record<Locale, () => Promise<{ default: Messages }>>;

// Every locale is a dynamic import so only the active catalogue is in the
// initial bundle. English messages are not special-cased: components carry
// `defaultMessage` for every string, so the UI is readable before (and if)
// a catalogue finishes loading.
const loaders: MessageLoaders = {
  en: () => import('./messages/en.json'),
  es: () => import('./messages/es.json'),
};

const cache = new Map<Locale, Messages>();

export async function loadMessages(locale: Locale): Promise<Messages> {
  const cached = cache.get(locale);
  if (cached) return cached;

  const loaded = (await loaders[locale]()).default;
  cache.set(locale, loaded);
  return loaded;
}

/** English catalogue is used to fill gaps in a stub locale. */
export async function loadMessagesWithFallback(locale: Locale): Promise<Messages> {
  if (locale === DEFAULT_LOCALE) return loadMessages(locale);

  const [messages, fallback] = await Promise.all([loadMessages(locale), loadMessages(DEFAULT_LOCALE)]);
  return { ...fallback, ...messages };
}

export function isSupportedLocale(value: string): value is Locale {
  return isLocale(value);
}
