import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataTable, type ColumnDefinition } from './DataTable';

interface Row {
  id: string;
  name: string;
  status: 'active' | 'pending';
}

const rows: Row[] = [
  { id: '1', name: 'Alice', status: 'active' },
  { id: '2', name: 'Bob', status: 'pending' },
  { id: '3', name: 'Charlie', status: 'active' },
];

const columns: ColumnDefinition<Row>[] = [
  { key: 'id', header: 'ID', sortable: true, render: (r) => r.id },
  { key: 'name', header: 'Name', sortable: true, render: (r) => r.name },
  { key: 'status', header: 'Status', render: (r) => r.status },
];

const filters = [
  { key: 'status', label: 'Status', type: 'select' as const, options: [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
  ]},
  { key: 'name', label: 'Name', type: 'text' as const },
];

function makeTable(overrides: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const props = {
    id: 'test',
    caption: 'Test table',
    columns,
    filters,
    rows,
    rowKey: (r: Row) => r.id,
    sort: null,
    onSortChange: vi.fn(),
    filterValues: {},
    onFilterChange: vi.fn(),
    hasPrev: false,
    hasNext: false,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    ...overrides,
  };
  return render(
    <MemoryRouter>
      <DataTable<Row> {...props} />
    </MemoryRouter>,
  );
}

describe('DataTable', () => {
  it('renders rows with column headers', () => {
    makeTable();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Use role selectors to avoid ambiguity with filter labels / cell values
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    expect(headerTexts.some((t) => t?.includes('ID'))).toBe(true);
    expect(headerTexts.some((t) => t?.includes('Name'))).toBe(true);
    expect(headerTexts.some((t) => t?.includes('Status'))).toBe(true);
  });

  it('renders an accessible caption', () => {
    makeTable();
    expect(screen.getByText('Test table')).toBeInTheDocument();
  });

  it('shows an empty state when rows is empty', () => {
    makeTable({ rows: [] });
    expect(screen.getByText('No entries found.')).toBeInTheDocument();
  });

  it('shows a loading spinner when isLoading and rows is empty', () => {
    makeTable({ isLoading: true, rows: [] });
    expect(screen.getAllByText('Loading\u2026').length).toBeGreaterThan(0);
  });

  it('shows an error message when error is set', () => {
    makeTable({ error: 'Something went wrong', rows: [] });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('toggles sort direction on click: none → asc → desc → clear', () => {
    const onSortChange = vi.fn();
    makeTable({ onSortChange });

    const buttons = screen.getAllByRole('button', { name: /activate to sort/i });
    const idButton = buttons[0]; // ID column

    // none → asc
    fireEvent.click(idButton);
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'id', direction: 'asc' });
  });

  it('calls onSortChange with desc when already sorted asc', () => {
    const onSortChange = vi.fn();
    makeTable({ sort: { key: 'id', direction: 'asc' }, onSortChange });

    const buttons = screen.getAllByRole('button', { name: /activate to sort/i });
    fireEvent.click(buttons[0]);
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'id', direction: 'desc' });
  });

  it('clears sort when already sorted desc', () => {
    const onSortChange = vi.fn();
    makeTable({ sort: { key: 'id', direction: 'desc' }, onSortChange });

    const buttons = screen.getAllByRole('button', { name: /activate to sort/i });
    fireEvent.click(buttons[0]);
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });

  it('sets aria-sort on sorted columns', () => {
    makeTable({ sort: { key: 'name', direction: 'asc' } });
    const headers = screen.getAllByRole('columnheader');
    const nameHeader = headers.find((h) => h.textContent?.includes('Name'));
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('does not render a sort button for non-sortable columns', () => {
    makeTable();
    const headers = screen.getAllByRole('columnheader');
    const statusHeader = headers.find((h) => h.textContent?.trim() === 'Status');
    expect(statusHeader?.querySelector('button')).toBeNull();
  });

  it('renders filter inputs and calls onFilterChange', () => {
    const onFilterChange = vi.fn();
    makeTable({ onFilterChange });

    const nameInput = screen.getByPlaceholderText('Filter by name');
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    expect(onFilterChange).toHaveBeenCalledWith('name', 'Alice');
  });

  it('renders select filters and calls onFilterChange', () => {
    const onFilterChange = vi.fn();
    makeTable({ onFilterChange });

    const select = screen.getByDisplayValue('All');
    fireEvent.change(select, { target: { value: 'active' } });
    expect(onFilterChange).toHaveBeenCalledWith('status', 'active');
  });

  it('disables prev/next buttons appropriately', () => {
    makeTable({ hasPrev: false, hasNext: false });
    const newerBtn = screen.getByRole('button', { name: 'Newer entries' });
    const olderBtn = screen.getByRole('button', { name: 'Older entries' });
    expect(newerBtn).toBeDisabled();
    expect(olderBtn).toBeDisabled();
  });

  it('enables next button when hasNext is true and calls onNext', () => {
    const onNext = vi.fn();
    makeTable({ hasNext: true, onNext });
    const olderBtn = screen.getByRole('button', { name: 'Older entries' });
    expect(olderBtn).not.toBeDisabled();
    fireEvent.click(olderBtn);
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('enables prev button when hasPrev is true and calls onPrev', () => {
    const onPrev = vi.fn();
    makeTable({ hasPrev: true, onPrev });
    const newerBtn = screen.getByRole('button', { name: 'Newer entries' });
    expect(newerBtn).not.toBeDisabled();
    fireEvent.click(newerBtn);
    expect(onPrev).toHaveBeenCalledOnce();
  });
});
