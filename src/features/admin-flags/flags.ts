import { formatDateTime } from '../../i18n/time-zone';
import type { Translator } from '../../i18n/useT';
import type { AuditEvent, FeatureFlag, FeatureFlagKind, Role } from '../../types/models';
import { englishTranslator } from '../../i18n/englishTranslator';

// Audit events for flags are assumed to use the Prisma model name, like every
// other entity in docforum-core's audit trail (docforum-core#132).
export const FLAG_ENTITY_TYPE = 'FeatureFlag';

export const ROLES: { value: Role; label: string; plural: string }[] = [
  { value: 'patient', label: 'Patient', plural: 'patients' },
  { value: 'doctor', label: 'Doctor', plural: 'doctors' },
  { value: 'facility', label: 'Facility', plural: 'facility staff' },
  { value: 'admin', label: 'Admin', plural: 'admins' },
];

export const KIND_LABELS: Record<FeatureFlagKind, string> = {
  boolean: 'On/off',
  percentage: 'Percentage rollout',
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

export function flagState(flag: Pick<FeatureFlag, 'enabled' | 'kind' | 'rolloutPercentage'>): FlagState {
  if (!flag.enabled) return 'off';
  if (flag.kind === 'percentage' && (flag.rolloutPercentage ?? 0) < 100) return 'rollout';
  return 'on';
}

function joinWords(words: string[], conjunction: string): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} ${conjunction} ${words[words.length - 1]}`;
}

export function kindLabel(kind: FeatureFlagKind, t: Translator = englishTranslator): string {
  return t(`adminFlags.kind.${kind}`, KIND_LABELS[kind]);
}

export function stateLabel(state: FlagState, t: Translator = englishTranslator): string {
  return t(`adminFlags.state.${state}`, STATE_LABELS[state]);
}

/** "everyone", or the targeted roles in a sentence ("patients and doctors"). */
export function describeRoles(roles: Role[], t: Translator = englishTranslator): string {
  if (roles.length === 0) return t('adminFlags.audience.everyone', 'everyone');
  const labels = ROLES.filter((role) => roles.includes(role.value)).map((role) =>
    t(`adminFlags.audience.role.${role.value}`, role.plural),
  );
  return joinWords(labels, t('adminFlags.audience.and', 'and'));
}

/**
 * Who a flag reaches, in one sentence the confirmation step can put side by
 * side ("before → after"). Mirrors the evaluation order assumed for #132:
 * kill switch, then allowlist, then roles, then the sticky percentage.
 */
export function describeAudience(
  flag: Pick<FeatureFlag, 'enabled' | 'kind' | 'rolloutPercentage' | 'targeting'>,
  t: Translator = englishTranslator,
): string {
  const allowlisted = flag.targeting.userIds.length;
  if (!flag.enabled) {
    return allowlisted > 0
      ? t('adminFlags.audience.offWithAllowlist', 'Off for everyone, allowlisted users included.')
      : t('adminFlags.audience.off', 'Off for everyone.');
  }

  const roles = describeRoles(flag.targeting.roles, t);
  const extra = allowlisted > 0
    ? t(
        'adminFlags.audience.plusAllowlist',
        ', plus {count, plural, one {# allowlisted user} other {# allowlisted users}}',
        { count: allowlisted },
      )
    : '';

  if (flag.kind === 'boolean') return t('adminFlags.audience.onFor', 'On for {roles}{extra}.', { roles, extra });

  const percentage = flag.rolloutPercentage ?? 0;
  if (percentage === 0) {
    return allowlisted > 0
      ? t(
          'adminFlags.audience.onAllowlistedOnly',
          'On only for {count, plural, one {# allowlisted user} other {# allowlisted users}}.',
          { count: allowlisted },
        )
      : t('adminFlags.audience.zeroPercent', 'Enabled, but at 0% nobody gets it.');
  }
  if (percentage === 100) return t('adminFlags.audience.onFor', 'On for {roles}{extra}.', { roles, extra });
  return t('adminFlags.audience.percentage', 'On for {percentage}% of {roles}{extra}.', { percentage, roles, extra });
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

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

export function formatRelative(iso: string, now: number): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return 'at an unknown time';
  const delta = at - now;
  if (Math.abs(delta) < 60_000) return 'just now';
  const [unit, size] = UNITS.find(([, length]) => Math.abs(delta) >= length) ?? UNITS[UNITS.length - 1];
  return relative.format(Math.trunc(delta / size), unit);
}

export function formatTimestamp(iso: string, timeZone: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return iso;
  return formatDateTime(at, timeZone, { dateStyle: 'medium', timeStyle: 'short' }, 'en-GB');
}
