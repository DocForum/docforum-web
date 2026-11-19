import { formatDateTime } from '../../i18n/time-zone';
import { identityTranslate } from '../../i18n/useT';
import type { Translate } from '../../i18n/useT';
import type { AuditEvent, FeatureFlag, FeatureFlagKind, Role } from '../../types/models';

// Audit events for flags are assumed to use the Prisma model name, like every
// other entity in docforum-core's audit trail (docforum-core#132).
export const FLAG_ENTITY_TYPE = 'FeatureFlag';

export const ROLES: { value: Role; label: string; plural: string }[] = [
  { value: 'patient', label: 'Patient', plural: 'patients' },
  { value: 'doctor', label: 'Doctor', plural: 'doctors' },
  { value: 'facility', label: 'Facility', plural: 'facility staff' },
  { value: 'admin', label: 'Admin', plural: 'admins' },
];

// API identifiers map to message ids; raw values are never rendered.
export const ROLE_MESSAGE_IDS: Record<Role, string> = {
  patient: 'admin.flags.role.patient',
  doctor: 'admin.flags.role.doctor',
  facility: 'admin.flags.role.facility',
  admin: 'admin.flags.role.admin',
};

export function roleLabel(role: Role, plural: boolean, t: Translate = identityTranslate): string {
  const id = plural ? `${ROLE_MESSAGE_IDS[role]}.plural` : ROLE_MESSAGE_IDS[role];
  const entry = ROLES.find((candidate) => candidate.value === role);
  return t(id, plural ? (entry?.plural ?? role) : (entry?.label ?? role));
}

export const KIND_LABELS: Record<FeatureFlagKind, string> = {
  boolean: 'On/off',
  percentage: 'Percentage rollout',
};

export const KIND_MESSAGE_IDS: Record<FeatureFlagKind, string> = {
  boolean: 'admin.flags.kind.boolean',
  percentage: 'admin.flags.kind.percentage',
};

/**
 * `on` reaches everyone it targets; `rollout` is enabled but held back to a
 * percentage below 100; `off` is the kill switch thrown. Role targeting
 * doesn't change the state — "on for doctors" is still on.
 */
export type FlagState = 'on' | 'rollout' | 'off';

export const STATE_LABELS: Record<FlagState, string> = {
  on: 'On',
  rollout: 'Rolling out',
  off: 'Off',
};

export const STATE_MESSAGE_IDS: Record<FlagState, string> = {
  on: 'admin.flags.state.on',
  rollout: 'admin.flags.state.rollout',
  off: 'admin.flags.state.off',
};

export function flagState(flag: Pick<FeatureFlag, 'enabled' | 'kind' | 'rolloutPercentage'>): FlagState {
  if (!flag.enabled) return 'off';
  if (flag.kind === 'percentage' && (flag.rolloutPercentage ?? 0) < 100) return 'rollout';
  return 'on';
}

function joinWords(words: string[], conjunction: string): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} ${conjunction} ${words[words.length - 1]}`;
}

/** "everyone", or the targeted roles in a sentence ("patients and doctors"). */
export function describeRoles(roles: Role[], t: Translate = identityTranslate): string {
  if (roles.length === 0) return t('admin.flags.audience.everyone', 'everyone');
  const conjunction = t('admin.flags.audience.conjunction', 'and');
  return joinWords(
    ROLES.filter((role) => roles.includes(role.value)).map((role) => roleLabel(role.value, true, t)),
    conjunction,
  );
}

/**
 * Who a flag reaches, in one sentence the confirmation step can put side by
 * side ("before → after"). Mirrors the evaluation order assumed for #132:
 * kill switch, then allowlist, then roles, then the sticky percentage.
 */
export function describeAudience(
  flag: Pick<FeatureFlag, 'enabled' | 'kind' | 'rolloutPercentage' | 'targeting'>,
  t: Translate = identityTranslate,
): string {
  const allowlisted = flag.targeting.userIds.length;
  const allowlistedPhrase = t(
    'admin.flags.audience.allowlisted',
    '{count, plural, one {1 allowlisted user} other {# allowlisted users}}',
    { count: allowlisted },
  );
  if (!flag.enabled) {
    return allowlisted > 0
      ? t(
          'admin.flags.audience.offWithAllowlist',
          'Off for everyone, allowlisted users included.',
        )
      : t('admin.flags.audience.off', 'Off for everyone.');
  }

  const roles = describeRoles(flag.targeting.roles, t);
  const extra =
    allowlisted > 0
      ? t('admin.flags.audience.plusAllowlisted', ', plus {allowlisted}', {
          allowlisted: allowlistedPhrase,
        })
      : '';

  if (flag.kind === 'boolean') {
    return t('admin.flags.audience.onFor', 'On for {roles}{extra}.', { roles, extra });
  }

  const percentage = flag.rolloutPercentage ?? 0;
  if (percentage === 0) {
    return allowlisted > 0
      ? t('admin.flags.audience.onlyAllowlisted', 'On only for {allowlisted}.', {
          allowlisted: allowlistedPhrase,
        })
      : t('admin.flags.audience.zeroPercent', 'Enabled, but at 0% nobody gets it.');
  }
  if (percentage === 100) {
    return t('admin.flags.audience.onFor', 'On for {roles}{extra}.', { roles, extra });
  }
  return t('admin.flags.audience.onForPercentage', 'On for {percentage}% of {roles}{extra}.', {
    percentage,
    roles,
    extra,
  });
}

// ---- Filters ---------------------------------------------------------------

export type StateFilter = FlagState | 'all';
export type KindFilter = FeatureFlagKind | 'all';

export interface FlagFilters {
  query: string;
  state: StateFilter;
  kind: KindFilter;
}

export const STATE_FILTERS: StateFilter[] = ['all', 'on', 'rollout', 'off'];

const MAX_QUERY_LENGTH = 100;

function isState(value: string | null): value is FlagState {
  return value !== null && Object.hasOwn(STATE_LABELS, value);
}

function isKind(value: string | null): value is FeatureFlagKind {
  return value !== null && Object.hasOwn(KIND_LABELS, value);
}

/** The URL is untrusted: unknown values fall back to "all", and the search
 * text is capped. It is only ever matched against, never sent anywhere. */
export function parseFlagSearch(params: URLSearchParams): FlagFilters {
  const state = params.get('state');
  const kind = params.get('kind');
  return {
    query: (params.get('q') ?? '').slice(0, MAX_QUERY_LENGTH),
    state: isState(state) ? state : 'all',
    kind: isKind(kind) ? kind : 'all',
  };
}

/** Defaults are left out so the plain `/admin/flags` link stays canonical. */
export function toFlagSearch(filters: FlagFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.slice(0, MAX_QUERY_LENGTH));
  if (filters.state !== 'all') params.set('state', filters.state);
  if (filters.kind !== 'all') params.set('kind', filters.kind);
  return params;
}

/** Case-insensitive substring match on the key and description. Underscores
 * and spaces are interchangeable, so "wallet pay" finds `wallet_payments`. */
export function matchesQuery(flag: FeatureFlag, query: string): boolean {
  const needle = query.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (!needle) return true;
  const haystack = `${flag.key} ${flag.description ?? ''}`.toLowerCase().replace(/[\s_-]+/g, ' ');
  return haystack.includes(needle);
}

/** Search and kind narrow the set the state chips count; the state filter
 * then picks within it. */
export function filterFlags(flags: FeatureFlag[], filters: Omit<FlagFilters, 'state'>): FeatureFlag[] {
  return flags
    .filter((flag) => (filters.kind === 'all' || flag.kind === filters.kind) && matchesQuery(flag, filters.query))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function countByState(flags: FeatureFlag[]): Record<StateFilter, number> {
  const counts: Record<StateFilter, number> = { all: flags.length, on: 0, rollout: 0, off: 0 };
  for (const flag of flags) counts[flagState(flag)] += 1;
  return counts;
}

// ---- Last change (from the audit trail) -----------------------------------

/** The newest audit event per flag id. Events arrive newest first, but the
 * timestamps decide, so a reordered page can't show an older change. */
export function latestChangeByFlag(events: AuditEvent[]): Map<string, AuditEvent> {
  const latest = new Map<string, AuditEvent>();
  for (const event of events) {
    if (event.entityType !== FLAG_ENTITY_TYPE) continue;
    const current = latest.get(event.entityId);
    if (!current || Date.parse(event.createdAt) > Date.parse(current.createdAt)) latest.set(event.entityId, event);
  }
  return latest;
}

export function auditTrailLink(flagId: string): string {
  return `/admin/audit?entityType=${FLAG_ENTITY_TYPE}&entityId=${encodeURIComponent(flagId)}`;
}

export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

// ---- Time ------------------------------------------------------------------

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

export function formatRelative(
  iso: string,
  now: number,
  locale = 'en',
  t: Translate = identityTranslate,
): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return t('admin.flags.time.unknown', 'at an unknown time');
  const delta = at - now;
  if (Math.abs(delta) < 60_000) return t('admin.flags.time.justNow', 'just now');
  const [unit, size] = UNITS.find(([, length]) => Math.abs(delta) >= length) ?? UNITS[UNITS.length - 1];
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    Math.trunc(delta / size),
    unit,
  );
}

export function formatTimestamp(iso: string, timeZone: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return iso;
  return formatDateTime(at, timeZone, { dateStyle: 'medium', timeStyle: 'short' }, 'en-GB');
}
