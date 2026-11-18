import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, parseSearchParams, toSearchParams } from './search-params';

function params(query: string) {
  return new URLSearchParams(query);
}

describe('parseSearchParams', () => {
  it('defaults to no symptom and any availability', () => {
    expect(parseSearchParams(params(''))).toEqual({ filters: EMPTY_FILTERS, issues: [] });
  });

  it('reads a valid symptom slug and availability', () => {
    const { filters, issues } = parseSearchParams(params('symptom=chest-pain&availability=today'));
    expect(filters).toEqual({ symptomSlug: 'chest-pain', availability: 'today' });
    expect(issues).toEqual([]);
  });

  it('normalises case and whitespace in the slug', () => {
    const { filters } = parseSearchParams(params('symptom=%20Chest-Pain%20'));
    expect(filters.symptomSlug).toBe('chest-pain');
  });

  it('drops an invalid slug with a notice', () => {
    const { filters, issues } = parseSearchParams(params('symptom=DROP%20TABLE%20users'));
    expect(filters.symptomSlug).toBe('');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/symptom link was not valid/i);
  });

  it('drops an invalid availability value with a notice', () => {
    const { filters, issues } = parseSearchParams(params('availability=whenever'));
    expect(filters.availability).toBe('any');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/availability filter .* not valid/i);
  });

  it('keeps the symptom when only availability is invalid', () => {
    const { filters, issues } = parseSearchParams(params('symptom=rash&availability=nope'));
    expect(filters).toEqual({ symptomSlug: 'rash', availability: 'any' });
    expect(issues).toHaveLength(1);
  });
});

describe('toSearchParams', () => {
  it('round-trips through parse', () => {
    const filters = { symptomSlug: 'chest-pain', availability: 'today' as const };
    expect(parseSearchParams(toSearchParams(filters)).filters).toEqual(filters);
  });

  it('omits defaults so the URL stays clean', () => {
    expect(toSearchParams(EMPTY_FILTERS).toString()).toBe('');
  });
});
