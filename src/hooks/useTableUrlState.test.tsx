import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useTableUrlState } from '../components/DataTable';
import type { FilterDefinition } from '../components/DataTable';

const filters: FilterDefinition[] = [
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
  ]},
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'from', label: 'From', type: 'date' },
];

function wrap(initialPath: string) {
  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    ),
  };
}

describe('useTableUrlState', () => {
  it('reads sort from URL', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/?test-sort=name&test-dir=desc'),
    );
    expect(result.current.sort).toEqual({ key: 'name', direction: 'desc' });
  });

  it('returns default sort when not in URL', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters, defaultSort: { key: 'id', direction: 'asc' } }),
      wrap('/'),
    );
    expect(result.current.sort).toEqual({ key: 'id', direction: 'asc' });
  });

  it('returns null sort when URL is invalid', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/?test-sort=name&test-dir=invalid'),
    );
    expect(result.current.sort).toBeNull();
  });

  it('reads filter values from URL', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/?test-f-status=active&test-f-name=Alice'),
    );
    expect(result.current.filterValues).toEqual({ status: 'active', name: 'Alice' });
  });

  it('drops invalid select values from URL', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/?test-f-status=invalid_value'),
    );
    expect(result.current.filterValues).toEqual({});
  });

  it('reads cursor from URL', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/?test-cursor=abc123'),
    );
    expect(result.current.cursor).toBe('abc123');
  });

  it('returns null cursor when not in URL', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/'),
    );
    expect(result.current.cursor).toBeNull();
  });

  it('reads date filter values from URL and falls back to unprefixed params', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/?from=2026-10-01&status=active'),
    );
    expect(result.current.filterValues).toEqual({ from: '2026-10-01', status: 'active' });
  });

  it('resets filters and clears cursor', () => {
    const { result } = renderHook(
      () => useTableUrlState({ id: 'test', filters }),
      wrap('/?test-f-status=active&test-f-from=2026-10-01&test-cursor=abc123'),
    );
    expect(result.current.filterValues).toEqual({ status: 'active', from: '2026-10-01' });
    expect(result.current.cursor).toBe('abc123');

    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filterValues).toEqual({});
    expect(result.current.cursor).toBeNull();
  });
});
