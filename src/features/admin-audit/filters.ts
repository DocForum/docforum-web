import type { AuditQuery } from '../../services/audit-service';

// The audit viewer's whole filter state lives in the URL query string, so a
// filtered view can be bookmarked, shared with another admin, or restored
// on reload. Everything read from the URL is untrusted input: values are
// trimmed, length-capped and shape-checked here before any of them reach
// an API call.

export type AuditTab = 'events' | 'access';

export interface AuditFilters {
  tab: AuditTab;
  entityType: string;
  entityId: string;
  actor: string;
  /** Events tab only. Matched client-side — see `matchesAction`. */
  action: string;
  /** YYYY-MM-DD, inclusive. */
  from: string;
  /** YYYY-MM-DD, inclusive. */
  to: string;
  cursor: string | null;
}

export type FilterField = 'entityType' | 'entityId' | 'actor' | 'action' | 'from' | 'to';

export type FilterDraft = Pick<AuditFilters, FilterField>;

export type FilterErrors = Partial<Record<FilterField | 'cursor' | 'tab', string>>;

export const EMPTY_FILTERS: AuditFilters = {
  tab: 'events',
  entityType: '',
  entityId: '',
  actor: '',
  action: '',
  from: '',
  to: '',
  cursor: null,
};

// URL keys. `actor` rather than `actorUserId` keeps shared links readable.
const PARAM = {
  tab: 'tab',
  entityType: 'entityType',
  entityId: 'entityId',
  actor: 'actor',
  action: 'action',
  from: 'from',
  to: 'to',
  cursor: 'cursor',
} as const;

const MAX_VALUE_LENGTH = 128;
const MAX_CURSOR_LENGTH = 512;

// Entity types are model names (`PaymentIntent`), ids are UUIDs, actions
// are dotted codes (`payment_intent.released`). One conservative charset
// covers all three without letting arbitrary text through.
const TOKEN_PATTERN = /^[A-Za-z0-9._:-]+$/;
// Cursors are opaque to us, but in practice base64/base64url.
const CURSOR_PATTERN = /^[A-Za-z0-9._~:+/=-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const FIELD_LABELS: Record<FilterField, string> = {
  entityType: 'Entity type',
  entityId: 'Entity id',
  actor: 'Actor user id',
  action: 'Action',
  from: 'From',
  to: 'To',
};

function checkToken(value: string): string | null {
  if (value.length > MAX_VALUE_LENGTH) return `Must be ${MAX_VALUE_LENGTH} characters or fewer.`;
  if (!TOKEN_PATTERN.test(value)) return 'Only letters, numbers and . _ : - are allowed.';
  return null;
}

/** Real calendar date check — `2026-02-30` matches the pattern but isn't a day. */
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validates a set of filter values, returning the cleaned filters plus an
 * error per rejected field. Rejected fields come back empty so callers can
 * always use `filters` safely.
 */
export function checkFilters(draft: FilterDraft): { filters: FilterDraft; errors: FilterErrors } {
  const errors: FilterErrors = {};
  const filters: FilterDraft = {
    entityType: draft.entityType.trim(),
    entityId: draft.entityId.trim(),
    actor: draft.actor.trim(),
    action: draft.action.trim(),
    from: draft.from.trim(),
    to: draft.to.trim(),
  };

  for (const field of ['entityType', 'entityId', 'actor', 'action'] as const) {
    if (!filters[field]) continue;
    const problem = checkToken(filters[field]);
    if (problem) {
      errors[field] = problem;
      filters[field] = '';
    }
  }

  // docforum-core answers 400 to an entityId without its entityType: ids
  // are only unique within a type.
  if (filters.entityId && !filters.entityType) {
    errors.entityId ??= 'Choose an entity type to filter by entity id.';
    filters.entityId = '';
  }

  for (const field of ['from', 'to'] as const) {
    if (filters[field] && !isCalendarDate(filters[field])) {
      errors[field] = 'Use a valid date (YYYY-MM-DD).';
      filters[field] = '';
    }
  }

  // ISO dates compare correctly as strings.
  if (filters.from && filters.to && filters.from > filters.to) {
    errors.to = 'End date must be on or after the start date.';
    filters.to = '';
  }

  return { filters, errors };
}

/** Reads the viewer's state from the URL. Never throws: invalid values are
 * dropped and reported in `issues` so the page can say what it ignored. */
export function parseAuditSearch(params: URLSearchParams): { filters: AuditFilters; issues: string[] } {
  const read = (key: string) => params.get(key) ?? '';
  const issues: string[] = [];

  const rawTab = read(PARAM.tab);
  let tab: AuditTab = 'events';
  if (rawTab === 'access') tab = 'access';
  else if (rawTab && rawTab !== 'events') issues.push('Unknown tab — showing state-change events.');

  const { filters: checked, errors } = checkFilters({
    entityType: read(PARAM.entityType),
    entityId: read(PARAM.entityId),
    actor: read(PARAM.actor),
    action: read(PARAM.action),
    from: read(PARAM.from),
    to: read(PARAM.to),
  });
  for (const [field, message] of Object.entries(errors)) {
    issues.push(`${FIELD_LABELS[field as FilterField]}: ${message}`);
  }

  const rawCursor = read(PARAM.cursor).trim();
  let cursor: string | null = null;
  if (rawCursor) {
    if (rawCursor.length <= MAX_CURSOR_LENGTH && CURSOR_PATTERN.test(rawCursor)) cursor = rawCursor;
    else issues.push('The page position in this link is malformed — showing the newest entries.');
  }

  return {
    filters: { ...checked, tab, action: tab === 'events' ? checked.action : '', cursor },
    issues,
  };
}

/** Inverse of `parseAuditSearch`. Defaults are omitted so URLs stay short. */
export function toAuditSearch(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== 'events') params.set(PARAM.tab, filters.tab);
  if (filters.entityType) params.set(PARAM.entityType, filters.entityType);
  if (filters.entityType && filters.entityId) params.set(PARAM.entityId, filters.entityId);
  if (filters.actor) params.set(PARAM.actor, filters.actor);
  if (filters.tab === 'events' && filters.action) params.set(PARAM.action, filters.action);
  if (filters.from) params.set(PARAM.from, filters.from);
  if (filters.to) params.set(PARAM.to, filters.to);
  if (filters.cursor) params.set(PARAM.cursor, filters.cursor);
  return params;
}

/** The server-side part of the filters. `action` is deliberately absent —
 * docforum-core's audit endpoint rejects it as an unknown parameter. */
export function toAuditQuery(filters: AuditFilters, limit: number): AuditQuery {
  return {
    entityType: filters.entityType || undefined,
    entityId: filters.entityId || undefined,
    actorUserId: filters.actor || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    cursor: filters.cursor,
    limit,
  };
}

/** Case-insensitive substring match, so `payment_intent` finds every
 * payment transition and `released` finds the release regardless of entity. */
export function matchesAction(action: string, filter: string): boolean {
  if (!filter) return true;
  return action.toLowerCase().includes(filter.toLowerCase());
}

export function hasActiveFilters(filters: AuditFilters): boolean {
  return Boolean(
    filters.entityType || filters.entityId || filters.actor || filters.action || filters.from || filters.to,
  );
}
