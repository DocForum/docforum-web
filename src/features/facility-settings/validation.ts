import type {
  FacilityOpeningHours,
  FacilitySettings,
  FacilitySettingsInput,
  PayoutAsset,
  Weekday,
} from '../../types/models';
import type { MessageValues } from '../../i18n/useT';

type Translate = (id: string, defaultMessage: string, values?: MessageValues) => string;

/**
 * Plain-English fallback for non-React callers and tests: substitutes simple
 * `{name}` placeholders the same way react-intl would, with no catalogue.
 */
const english: Translate = (_id, defaultMessage, values) =>
  defaultMessage.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values?.[key];
    return value === undefined || value === null ? match : String(value);
  });

export const WEEKDAYS: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Weekday names come from Intl for the active locale, never a string table. */
export function weekdayLabel(day: Weekday, locale?: string): string {
  const mondayIndexes: Record<Weekday, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };
  // 2024-01-01 was a Monday. Noon UTC never shifts to an adjacent day.
  const date = new Date(Date.UTC(2024, 0, 1 + mondayIndexes[day], 12));
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
}

/** Stellar payment assets settle in 7 decimal places (10,000,000 stroops). */
export const ASSET_DECIMALS: Record<PayoutAsset, number> = {
  XLM: 7,
  USDC: 7,
};

function stroopsPerUnit(asset: PayoutAsset): bigint {
  return 10n ** BigInt(ASSET_DECIMALS[asset]);
}

export function emptyOpeningHours(): FacilityOpeningHours[] {
  return WEEKDAYS.map((day) => ({
    day,
    closed: day === 'sunday',
    opensAt: day === 'sunday' ? null : '09:00',
    closesAt: day === 'sunday' ? null : '17:00',
  }));
}

export function normaliseOpeningHours(
  hours: FacilityOpeningHours[] | undefined,
): FacilityOpeningHours[] {
  return WEEKDAYS.map((day) => {
    const existing = hours?.find((entry) => entry.day === day);
    if (existing) return { ...existing, day };
    return { day, closed: true, opensAt: null, closesAt: null };
  });
}

export interface FacilitySettingsDraft {
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  openingHours: FacilityOpeningHours[];
}

export function settingsToDraft(settings: FacilitySettings): FacilitySettingsDraft {
  return {
    address: settings.address,
    city: settings.city,
    latitude: settings.latitude === null ? '' : String(settings.latitude),
    longitude: settings.longitude === null ? '' : String(settings.longitude),
    phone: settings.phone,
    email: settings.email ?? '',
    openingHours: normaliseOpeningHours(settings.openingHours),
  };
}

export interface OpeningHoursErrors {
  opensAt?: string;
  closesAt?: string;
}

export interface FacilitySettingsErrors {
  address?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  phone?: string;
  email?: string;
  openingHours: Partial<Record<Weekday, OpeningHoursErrors>>;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const COORDINATE_PATTERN = /^-?\d+(?:\.\d+)?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFacilitySettings(
  draft: FacilitySettingsDraft,
  t: Translate = english,
): FacilitySettingsErrors {
  const errors: FacilitySettingsErrors = { openingHours: {} };

  if (!draft.address.trim()) errors.address = t('facilitySettings.validation.addressRequired', 'Street address is required.');
  if (!draft.city.trim()) errors.city = t('facilitySettings.validation.cityRequired', 'City is required.');
  if (!draft.phone.trim()) errors.phone = t('facilitySettings.validation.phoneRequired', 'Contact phone is required.');
  if (draft.email.trim() && !EMAIL_PATTERN.test(draft.email.trim())) {
    errors.email = t('facilitySettings.validation.emailInvalid', 'Enter a valid contact email address.');
  }

  const lat = parseCoordinate(draft.latitude);
  if (lat === null || lat < -90 || lat > 90) {
    errors.latitude = t('facilitySettings.validation.latitudeRange', 'Enter a latitude between -90 and 90.');
  }

  const lng = parseCoordinate(draft.longitude);
  if (lng === null || lng < -180 || lng > 180) {
    errors.longitude = t('facilitySettings.validation.longitudeRange', 'Enter a longitude between -180 and 180.');
  }

  for (const hours of normaliseOpeningHours(draft.openingHours)) {
    if (hours.closed) continue;
    const dayErrors: OpeningHoursErrors = {};
    if (!hours.opensAt || !TIME_PATTERN.test(hours.opensAt)) {
      dayErrors.opensAt = t('facilitySettings.validation.opensAtRequired', 'Enter an opening time.');
    }
    if (!hours.closesAt || !TIME_PATTERN.test(hours.closesAt)) {
      dayErrors.closesAt = t('facilitySettings.validation.closesAtRequired', 'Enter a closing time.');
    }
    if (!dayErrors.opensAt && !dayErrors.closesAt && hours.opensAt! >= hours.closesAt!) {
      dayErrors.closesAt = t('facilitySettings.validation.closesAfterOpens', 'Closing time must be after opening time.');
    }
    if (dayErrors.opensAt || dayErrors.closesAt) errors.openingHours[hours.day] = dayErrors;
  }

  return errors;
}

export function hasFacilitySettingsErrors(errors: FacilitySettingsErrors): boolean {
  return Boolean(
    errors.address ||
      errors.city ||
      errors.latitude ||
      errors.longitude ||
      errors.phone ||
      errors.email ||
      Object.keys(errors.openingHours).length > 0,
  );
}

export function draftToSettingsInput(draft: FacilitySettingsDraft): FacilitySettingsInput {
  return {
    address: draft.address.trim(),
    city: draft.city.trim(),
    latitude: Number(draft.latitude),
    longitude: Number(draft.longitude),
    phone: draft.phone.trim(),
    email: draft.email.trim() || null,
    openingHours: normaliseOpeningHours(draft.openingHours),
  };
}

function parseCoordinate(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !COORDINATE_PATTERN.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export interface ParsedAmount {
  amountStroops: string | null;
  error: string | null;
}

/** Converts a human-entered decimal amount to raw stroops without floats. */
export function parseAssetAmount(
  raw: string,
  asset: PayoutAsset,
  t: Translate = english,
): ParsedAmount {
  const trimmed = raw.trim();
  const decimals = ASSET_DECIMALS[asset];
  if (!trimmed) return { amountStroops: null, error: t('facilitySettings.validation.amountRequired', 'Enter an amount.') };

  const pattern = new RegExp(`^\\d+(?:\\.(\\d{1,${decimals}}))?$`);
  const match = trimmed.match(pattern);
  if (!match) {
    if (/^\d+\.\d+$/.test(trimmed)) {
      return {
        amountStroops: null,
        error: t('facilitySettings.validation.tooManyDecimals', '{asset} supports at most {decimals} decimal places.', {
          asset,
          decimals,
        }),
      };
    }
    return {
      amountStroops: null,
      error: t('facilitySettings.validation.amountFormat', 'Enter a positive amount using digits and a decimal point.'),
    };
  }

  const [whole, fraction = ''] = trimmed.split('.');
  const amount = BigInt(whole) * stroopsPerUnit(asset) + BigInt(fraction.padEnd(decimals, '0'));
  if (amount <= 0n) return { amountStroops: null, error: t('facilitySettings.validation.amountPositive', 'Amount must be greater than 0.') };

  return { amountStroops: amount.toString(), error: null };
}

export function formatAmountFromStroops(amountStroops: string, asset: PayoutAsset): string {
  const decimals = ASSET_DECIMALS[asset];
  const raw = BigInt(amountStroops || '0');
  const unit = stroopsPerUnit(asset);
  const whole = raw / unit;
  const fraction = (raw % unit).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function toLocalDateTimeInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function parseEffectiveFrom(raw: string, t: Translate = english): { iso: string | null; error: string | null } {
  if (!raw) return { iso: null, error: t('facilitySettings.validation.effectiveRequired', 'Choose when this price takes effect.') };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { iso: null, error: t('facilitySettings.validation.effectiveInvalid', 'Choose a valid effective-from date and time.') };
  }
  return { iso: date.toISOString(), error: null };
}
