// Merged locale store — patient preference (en/es) + formatting locale (en-US, en-GB, de-DE, ar-EG)
// dir is computed from the language subtag; document.lang/dir are synced by I18nProvider.
//
// A signed-in user's stored `locale` (docforum-core returns it on login and
// refresh) wins over `navigator.language` — see issue #256. `applyUserLocale`
// is what the auth store calls: it does nothing once the person has picked a
// locale themselves in this session (`manualOverride`), and signing out puts
// the browser language back (`resetToBrowserLocale`). Persisting a switch
// needs a docforum-core endpoint that does not exist yet.
import { create } from 'zustand';
import { resolveLocale, type Locale } from '../i18n/locales';
import { directionFor, type AppLocale } from '../i18n/format';

// Normalize the patient locale to an AppLocale for formatting consistency
function patientLocaleToAppLocale(locale: Locale): AppLocale {
  return locale as AppLocale;
}

interface LocaleState {
  /** Patient-facing locale preference: 'en' | 'es' */
  patientLocale: Locale;
  /** Formatting locale: 'en-US' | 'en-GB' | 'de-DE' | 'ar-EG' */
  formattingLocale: AppLocale;
  /** True once the person changed the locale in this session. A stored user
   * locale must not undo that choice (issue #256). */
  manualOverride: boolean;
  setPatientLocale: (locale: Locale) => void;
  setFormattingLocale: (locale: AppLocale) => void;
  setLocale: (locale: Locale) => void; // convenience: updates both
  /** Apply the locale docforum-core stored on the user, if it is supported
   * and the person hasn't chosen one this session. Returns whether it applied. */
  applyUserLocale: (locale: string | null | undefined) => boolean;
  /** Back to `navigator.language` — used when the session ends. */
  resetToBrowserLocale: () => void;
  currentDirection: () => 'ltr' | 'rtl';
}

function browserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return resolveLocale(navigator.language);
}

function formattingLocaleFor(locale: Locale): AppLocale {
  // Use the patient locale as the starting point for formatting, mapped to the closest IANA locale
  if (locale === 'es') return 'es' as AppLocale; // es-MX/es-AR etc mapped to es
  return 'en-US';
}

function directionForLocale(locale: AppLocale): 'ltr' | 'rtl' {
  // Use the format module's directionFor which checks RTL languages
  return directionFor(locale);
}

function syncDirection(locale: AppLocale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = directionForLocale(locale);
  }
}

export const useLocaleStore = create<LocaleState>((set, get) => {
  const applyPatientLocale = (locale: Locale, manualOverride: boolean) => {
    const formattingLocale = patientLocaleToAppLocale(locale);
    set({ patientLocale: locale, formattingLocale, manualOverride });
    syncDirection(formattingLocale);
  };

  return {
    patientLocale: browserLocale(),
    formattingLocale: formattingLocaleFor(browserLocale()),
    manualOverride: false,
    setPatientLocale: (locale) => applyPatientLocale(locale, true),
    setFormattingLocale: (locale) => {
      set({ formattingLocale: locale, manualOverride: true });
      syncDirection(locale);
    },
    setLocale: (locale) => applyPatientLocale(locale, true),
    applyUserLocale: (locale) => {
      if (get().manualOverride) return false;
      // No stored locale means the account predates the field: keep the
      // browser language. A regional tag (`es-MX`) and an unsupported one
      // (`fr`) both go through resolveLocale, which answers `en` for the
      // latter — the documented fallback (issue #256).
      if (!locale) return false;
      applyPatientLocale(resolveLocale(locale), false);
      return true;
    },
    resetToBrowserLocale: () => applyPatientLocale(browserLocale(), false),
    currentDirection: () => directionForLocale(get().formattingLocale),
  };
});
