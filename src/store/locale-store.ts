// Merged locale store — patient preference (en/es) + formatting locale (en-US, en-GB, de-DE, ar-EG)
// dir is computed from the language subtag; document.lang/dir are synced by I18nProvider.
// When the backend adds `locale` to the user profile (issue #87), this store becomes
// the read-through cache; setLocale will also PATCH the profile.
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
  setPatientLocale: (locale: Locale) => void;
  setFormattingLocale: (locale: AppLocale) => void;
  setLocale: (locale: Locale) => void; // convenience: updates both
  currentDirection: () => 'ltr' | 'rtl';
}

function initialPatientLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return resolveLocale(navigator.language);
}

function initialFormattingLocale(): AppLocale {
  // Use the patient locale as the starting point for formatting, mapped to the closest IANA locale
  const patient = initialPatientLocale();
  if (patient === 'es') return 'es' as AppLocale; // es-MX/es-AR etc mapped to es
  return 'en-US';
}

function directionForLocale(locale: AppLocale): 'ltr' | 'rtl' {
  // Use the format module's directionFor which checks RTL languages
  return directionFor(locale);
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  patientLocale: initialPatientLocale(),
  formattingLocale: initialFormattingLocale(),
  setPatientLocale: (locale) => set({ patientLocale: locale, formattingLocale: patientLocaleToAppLocale(locale) }),
  setFormattingLocale: (locale) => set({ formattingLocale: locale }),
  setLocale: (locale) => {
    const appLocale = patientLocaleToAppLocale(locale);
    set({ patientLocale: locale, formattingLocale: appLocale });
    // Sync document.dir when locale changes — handled by I18nProvider's useEffect,
    // but we also expose it here for direct use:
    const dir = directionForLocale(appLocale);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
    }
  },
  currentDirection: () => directionForLocale(get().formattingLocale),
}));