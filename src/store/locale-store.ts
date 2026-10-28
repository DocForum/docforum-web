// Client-only locale preference.
//
// Kept in memory (not localStorage): docforum-core has no `locale` field on
// the user yet, and this repo's rule is that server-derived preferences live
// in the API, not browser storage. When the backend adds `locale` (see
// issue #87), this store becomes the read-through cache for it — the
// `setLocale` call will also PATCH the profile.
import { create } from 'zustand';
import { resolveLocale, type Locale } from '../i18n/locales';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function initialLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return resolveLocale(navigator.language);
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale(),
  setLocale: (locale) => set({ locale }),
}));
