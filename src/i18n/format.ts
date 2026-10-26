// Locale-aware formatting helpers (issue #88).
//
// Every date/time/number/amount the UI renders should go through this
// module instead of ad-hoc `toLocaleString()` calls, so that:
//   - dates are never ambiguous numeric forms like 03/04 (month names are
//     always used for day/month combinations),
//   - appointment times carry an explicit time zone,
//   - asset amounts (bigint strings) never pass through `Number` and lose
//     precision,
//   - the same options are used everywhere for a given locale.
//
// These are pure functions plus a `createFormatters()` factory so they can
// be unit-tested across locales without touching global state.

export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'de-DE', 'ar-EG'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en-US';
export const DEFAULT_TIME_ZONE = 'UTC';

export interface LocaleMeta {
  id: AppLocale;
  label: string;
  dir: 'ltr' | 'rtl';
  /** BCP 47 region/language that the date layout is demonstrated with. */
  example: string;
}

export const LOCALE_META: Record<AppLocale, LocaleMeta> = {
  'en-US': { id: 'en-US', label: 'English (United States)', dir: 'ltr', example: 'Mar 4, 2026' },
  'en-GB': { id: 'en-GB', label: 'English (United Kingdom)', dir: 'ltr', example: '4 Mar 2026' },
  'de-DE': { id: 'de-DE', label: 'Deutsch (Deutschland)', dir: 'ltr', example: '4. März 2026' },
  'ar-EG': { id: 'ar-EG', label: 'العربية (مصر) — RTL', dir: 'rtl', example: '٤ مارس ٢٠٢٦' },
};

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'dv', 'ps', 'ku', 'ckb']);

/** True when the language subtag is written right-to-left. */
export function isRtlLocale(locale: string): boolean {
  return RTL_LANGUAGES.has(locale.toLowerCase().split('-')[0] ?? '');
}

export function directionFor(locale: string): 'ltr' | 'rtl' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value) && (SUPPORTED_LOCALES as readonly string[]).includes(value as string);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse an ISO timestamp. Date-only values (`YYYY-MM-DD`) are anchored at
 * noon UTC so that formatting them in a western time zone can never shift
 * them to the previous day — birthdays and appointment dates are calendar
 * facts, not instants.
 */
export function parseIso(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (DATE_ONLY.test(value)) return new Date(`${value}T12:00:00.000Z`);
  return new Date(value);
}

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function safeFormat(
  value: string | Date,
  formatter: Intl.DateTimeFormat,
  fallback: string,
): string {
  const date = parseIso(value);
  if (!isValidDate(date)) return fallback;
  try {
    return formatter.format(date);
  } catch {
    return fallback;
  }
}

export interface DateFormatOptions {
  /** IANA time zone. Defaults to the formatter's configured zone. */
  timeZone?: string;
  /** Show the time zone name (e.g. "GMT+2"). Required for appointment times. */
  withTimeZoneName?: boolean;
  /** Include the time as well as the date. */
  withTime?: boolean;
}

export interface AssetAmountOptions {
  /**
   * Number of decimal places the amount string is denominated in (stroops
   * for XLM = 7, cents for USDC = 2). Defaults to 0.
   */
  decimals?: number;
  /** Minimum fraction digits to always show. Defaults to 2 for assets. */
  minFractionDigits?: number;
  /** Maximum fraction digits to show. Defaults to `decimals` (trimmed). */
  maxFractionDigits?: number;
  /** Include the asset code after the number. Defaults to true. */
  withAsset?: boolean;
}

/**
 * Build a formatter bound to one locale and default time zone.
 * `format*` functions always accept an explicit locale too, so non-React
 * call sites and tests never depend on module-level mutable state.
 */
export function createFormatters(locale: string = DEFAULT_LOCALE, defaultTimeZone: string = DEFAULT_TIME_ZONE) {
  const numberFormat = (options: Intl.NumberFormatOptions = {}) =>
    new Intl.NumberFormat(locale, options);

  const dateFormatter = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options);

  function formatDate(value: string | Date, options: Omit<DateFormatOptions, 'withTimeZoneName' | 'withTime'> = {}): string {
    const timeZone = options.timeZone ?? (DATE_ONLY.test(String(value)) ? 'UTC' : defaultTimeZone);
    return safeFormat(
      value,
      dateFormatter({ year: 'numeric', month: 'short', day: 'numeric', timeZone }),
      '—',
    );
  }

  function formatTime(value: string | Date, options: Omit<DateFormatOptions, 'withTimeZoneName' | 'withTime'> = {}): string {
    return safeFormat(
      value,
      dateFormatter({
        hour: '2-digit',
        minute: '2-digit',
        timeZone: options.timeZone ?? defaultTimeZone,
      }),
      '—',
    );
  }

  function formatDateTime(value: string | Date, options: DateFormatOptions = {}): string {
    return safeFormat(
      value,
      dateFormatter({
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: options.timeZone ?? defaultTimeZone,
        ...(options.withTimeZoneName ? { timeZoneName: 'short' as const } : {}),
      }),
      '—',
    );
  }

  /**
   * Appointment times are the one place where an unlabelled wall-clock
   * time is genuinely dangerous, so this always includes the time zone.
   */
  function formatAppointmentTime(value: string | Date, timeZone?: string): string {
    return formatDateTime(value, {
      timeZone: timeZone ?? defaultTimeZone,
      withTimeZoneName: true,
    });
  }

  function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
    const date = parseIso(value);
    if (!isValidDate(date)) return '—';
    const diffMs = date.getTime() - now.getTime();
    const abs = Math.abs(diffMs);
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 365 * 24 * 60 * 60 * 1000],
      ['month', 30 * 24 * 60 * 60 * 1000],
      ['week', 7 * 24 * 60 * 60 * 1000],
      ['day', 24 * 60 * 60 * 1000],
      ['hour', 60 * 60 * 1000],
      ['minute', 60 * 1000],
    ];

    for (const [unit, size] of units) {
      if (abs >= size) return relative.format(Math.round(diffMs / size), unit);
    }
    return relative.format(Math.round(diffMs / 1000), 'second');
  }

  function formatNumber(value: number | bigint, options: Intl.NumberFormatOptions = {}): string {
    return numberFormat(options).format(value);
  }

  /** Localized duration label, e.g. 19.4 h / 19,4 Std. */
  function formatDuration(
    value: number,
    unit: 'minute' | 'hour' | 'day',
    fractionDigits = 1,
  ): string {
    return numberFormat({
      style: 'unit',
      unit,
      unitDisplay: 'narrow',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }

  /** `percent` is a 0–100 value, matching the API's rate fields. */
  function formatPercent(percent: number, fractionDigits = 1): string {
    return numberFormat({
      style: 'percent',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(percent / 100);
  }

  /**
   * Group a decimal string without ever converting it to a JS number.
   * `Intl.NumberFormat` only sees a constant probe to discover the locale's
   * group/decimal separators; the amount itself stays a string.
   */
  function formatDecimalString(
    amount: string,
    options: { minFractionDigits?: number; maxFractionDigits?: number; group?: boolean } = {},
  ): string {
    const { minFractionDigits = 0, maxFractionDigits, group = true } = options;
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(amount.trim());
    if (!match) {
      throw new Error(`formatDecimalString: not a decimal string: ${JSON.stringify(amount)}`);
    }

    const [, sign, integerRaw, fractionRaw = ''] = match;
    let fraction = fractionRaw;

    const max = maxFractionDigits ?? fraction.length;
    fraction = fraction.slice(0, max);
    while (fraction.length < minFractionDigits) fraction += '0';
    fraction = fraction.replace(/0+$/, '');
    if (fraction.length < minFractionDigits) fraction = fraction.padEnd(minFractionDigits, '0');

    const probe = new Intl.NumberFormat(locale).formatToParts(1234567.5);
    const groupSeparator = probe.find((part) => part.type === 'group')?.value ?? ',';
    const decimalSeparator = probe.find((part) => part.type === 'decimal')?.value ?? '.';

    const integer = group
      ? integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
      : integerRaw;

    return `${sign}${integer}${fraction ? `${decimalSeparator}${fraction}` : ''}`;
  }

  /**
   * Format an asset amount expressed in minor units (e.g. stroops) as a
   * human-readable string. Never uses `Number` — a bigint string with more
   * digits than `Number.MAX_SAFE_INTEGER` must round-trip exactly.
   */
  function formatAssetAmount(amount: string, asset: string, options: AssetAmountOptions = {}): string {
    const { decimals = 0, minFractionDigits = Math.min(2, decimals), maxFractionDigits, withAsset = true } = options;

    const match = /^([+-]?)(\d+)$/.exec(amount.trim());
    if (!match) {
      throw new Error(`formatAssetAmount: not an integer minor-unit string: ${JSON.stringify(amount)}`);
    }
    const [, sign, digits] = match;
    const padded = digits.padStart(decimals + 1, '0');
    const integerPart = decimals > 0 ? padded.slice(0, -decimals) : padded;
    const fractionPart = decimals > 0 ? padded.slice(-decimals) : '';

    const value = formatDecimalString(`${sign}${integerPart}${fractionPart ? `.${fractionPart}` : ''}`, {
      minFractionDigits,
      maxFractionDigits: maxFractionDigits ?? decimals,
    });

    return withAsset ? `${value} ${asset}` : value;
  }

  return {
    locale,
    formatDate,
    formatTime,
    formatDateTime,
    formatAppointmentTime,
    formatRelativeTime,
    formatNumber,
    formatDuration,
    formatPercent,
    formatDecimalString,
    formatAssetAmount,
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
