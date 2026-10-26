import { create } from 'zustand';
import {
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
  directionFor,
  type AppLocale,
} from './format';

// Client-only UI preference (which locale to format in). Deliberately
// in-memory like the rest of this app's stores: nothing here is
// server-derived, and the architecture rules forbid persisting business
// data to storage. A future i18n framework can hydrate this from a cookie
// or user preference once docforum-core exposes one.
interface LocaleState {
  locale: AppLocale;
  timeZone: string;
  setLocale: (locale: AppLocale) => void;
  setTimeZone: (timeZone: string) => void;
}

function detectedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: DEFAULT_LOCALE,
  timeZone: detectedTimeZone(),
  setLocale: (locale) => set({ locale }),
  setTimeZone: (timeZone) => set({ timeZone }),
}));

export function currentDirection(): 'ltr' | 'rtl' {
  return directionFor(useLocaleStore.getState().locale);
}
