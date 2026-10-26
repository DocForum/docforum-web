import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  checkFilters,
  hasActiveFilters,
  matchesAction,
  parseAuditSearch,
  toAuditQuery,
  toAuditSearch,
} from './filters';
import type { AuditFilters } from './filters';

const FULL: AuditFilters = {
  tab: 'events',
  entityType: 'PaymentIntent',
  entityId: '7b1c9a52-3f0e-4c1a-9d55-2f6c8e0a1b11',
  actor: 'a4e0f3d2-1111-4c1a-9d55-2f6c8e0a1b11',
  action: 'payment_intent.released',
  from: '2026-10-01',
  to: '2026-10-18',
  cursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTE4In0=',
};

const draftOf = ({ entityType, entityId, actor, action, from, to }: AuditFilters) => ({
  entityType,
  entityId,
  actor,
  action,
  from,
  to,
});

describe('audit URL filters', () => {
  it('round-trips every filter through the query string', () => {
    const search = toAuditSearch(FULL);
    expect(parseAuditSearch(new URLSearchParams(search.toString()))).toEqual({ filters: FULL, issues: [] });
  });

  it('round-trips the access tab, dropping the events-only action filter', () => {
    const access = { ...FULL, tab: 'access' as const };
    const search = toAuditSearch(access);
    expect(search.get('tab')).toBe('access');
    expect(search.has('action')).toBe(false);
    expect(parseAuditSearch(search).filters).toEqual({ ...access, action: '' });
  });

  it('omits defaults so an unfiltered view has an empty query string', () => {
    expect(toAuditSearch(EMPTY_FILTERS).toString()).toBe('');
    expect(parseAuditSearch(new URLSearchParams()).filters).toEqual(EMPTY_FILTERS);
  });

  it('trims values read from the URL', () => {
    const { filters } = parseAuditSearch(new URLSearchParams('entityType=%20Appointment%20&actor=%20u-1'));
    expect(filters.entityType).toBe('Appointment');
    expect(filters.actor).toBe('u-1');
  });

  it('drops and reports values that are not ids or codes', () => {
    const { filters, issues } = parseAuditSearch(
      new URLSearchParams({ entityType: '<script>', actor: 'x'.repeat(200), tab: 'nope' }),
    );
    expect(filters.entityType).toBe('');
    expect(filters.actor).toBe('');
    expect(filters.tab).toBe('events');
    expect(issues).toHaveLength(3);
  });

  it('drops an entity id that has no entity type, as the backend would reject it', () => {
    const { filters, issues } = parseAuditSearch(new URLSearchParams('entityId=abc'));
    expect(filters.entityId).toBe('');
    expect(issues).toEqual(['Entity id: Choose an entity type to filter by entity id.']);
  });

  it('rejects impossible dates and an inverted range', () => {
    expect(checkFilters({ ...draftOf(EMPTY_FILTERS), from: '2026-02-30' }).errors.from).toMatch(/valid date/);
    expect(checkFilters({ ...draftOf(EMPTY_FILTERS), to: '18/10/2026' }).errors.to).toMatch(/valid date/);
    const inverted = checkFilters({ ...draftOf(EMPTY_FILTERS), from: '2026-10-18', to: '2026-10-01' });
    expect(inverted.errors.to).toMatch(/on or after/);
    expect(inverted.filters.from).toBe('2026-10-18');
    expect(inverted.filters.to).toBe('');
  });

  it('accepts a single-day range', () => {
    expect(checkFilters({ ...draftOf(EMPTY_FILTERS), from: '2026-10-18', to: '2026-10-18' }).errors).toEqual({});
  });

  it('ignores a malformed cursor instead of sending it', () => {
    const { filters, issues } = parseAuditSearch(new URLSearchParams('cursor=not a cursor'));
    expect(filters.cursor).toBeNull();
    expect(issues[0]).toMatch(/page position/);
  });

  it('builds the server query without the client-side action filter', () => {
    expect(toAuditQuery(FULL, 50)).toEqual({
      entityType: 'PaymentIntent',
      entityId: FULL.entityId,
      actorUserId: FULL.actor,
      from: '2026-10-01',
      to: '2026-10-18',
      cursor: FULL.cursor,
      limit: 50,
    });
    expect(toAuditQuery(EMPTY_FILTERS, 50)).toEqual({
      entityType: undefined,
      entityId: undefined,
      actorUserId: undefined,
      from: undefined,
      to: undefined,
      cursor: null,
      limit: 50,
    });
  });

  it('matches actions case-insensitively by substring', () => {
    expect(matchesAction('payment_intent.released', 'PAYMENT_INTENT')).toBe(true);
    expect(matchesAction('payment_intent.released', 'released')).toBe(true);
    expect(matchesAction('appointment.booked', 'released')).toBe(false);
    expect(matchesAction('appointment.booked', '')).toBe(true);
  });

  it('treats only real filters, not tab or cursor, as active', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, tab: 'access', cursor: 'abc' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, from: '2026-10-01' })).toBe(true);
  });
});
