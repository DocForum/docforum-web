// CSF 3 stories for the DataTable component.
// These follow the Component Story Format so they can be picked up by
// Storybook once it is installed (issue #97).  The Meta/StoryObj types
// are stubbed locally so the file typechecks today without @storybook/react.

import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DataTable, type ColumnDefinition, type FilterDefinition } from './DataTable';

// ─── Local CSF stubs (remove once @storybook/react is installed) ────────

interface Meta {
  title: string;
  component: typeof DataTable;
  decorators: ((story: () => ReactNode) => ReactNode)[];
  tags: string[];
}

type StoryObj = { render: () => ReactNode };

function defineMeta(meta: Meta): Meta {
  return meta;
}

// ─── Shared fixtures ─────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
}

const users: User[] = [
  { id: 'u1', name: 'Alice Carter', email: 'alice@example.test', status: 'active' },
  { id: 'u2', name: 'Bob Park', email: 'bob@example.test', status: 'pending' },
  { id: 'u3', name: 'Charlie Lee', email: 'charlie@example.test', status: 'active' },
  { id: 'u4', name: 'Dana Wu', email: 'dana@example.test', status: 'suspended' },
  { id: 'u5', name: 'Eve Stone', email: 'eve@example.test', status: 'pending' },
];

const columns: ColumnDefinition<User>[] = [
  { key: 'id', header: 'ID', sortable: true, render: (u) => u.id },
  { key: 'name', header: 'Name', sortable: true, render: (u) => u.name },
  { key: 'email', header: 'Email', render: (u) => u.email },
  { key: 'status', header: 'Status', sortable: true, render: (u) => u.status },
];

const filters: FilterDefinition[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'suspended', label: 'Suspended' },
    ],
  },
  { key: 'name', label: 'Name', type: 'text' },
];

const meta = defineMeta({
  title: 'Components/DataTable',
  component: DataTable,
  decorators: [
    (story) => <MemoryRouter>{story()}</MemoryRouter>,
  ],
  tags: ['autodocs'],
});

export default meta;

// ─── Stories ─────────────────────────────────────────────────────────────

export const Default: StoryObj = {
  render: () => (
    <DataTable<User>
      id="users"
      caption="User list"
      columns={columns}
      filters={filters}
      rows={users}
      rowKey={(u) => u.id}
      sort={null}
      onSortChange={() => {}}
      filterValues={{}}
      onFilterChange={() => {}}
      hasPrev={false}
      hasNext={true}
      onPrev={() => {}}
      onNext={() => {}}
    />
  ),
};

export const SortedByName: StoryObj = {
  render: () => (
    <DataTable<User>
      id="users-sorted"
      caption="User list"
      columns={columns}
      filters={filters}
      rows={users}
      rowKey={(u) => u.id}
      sort={{ key: 'name', direction: 'asc' }}
      onSortChange={() => {}}
      filterValues={{}}
      onFilterChange={() => {}}
      hasPrev={false}
      hasNext={true}
      onPrev={() => {}}
      onNext={() => {}}
    />
  ),
};

export const Loading: StoryObj = {
  render: () => (
    <DataTable<User>
      id="users-loading"
      caption="User list"
      columns={columns}
      filters={filters}
      rows={[]}
      rowKey={(u) => u.id}
      isLoading
      sort={null}
      onSortChange={() => {}}
      filterValues={{}}
      onFilterChange={() => {}}
      hasPrev={false}
      hasNext={false}
      onPrev={() => {}}
      onNext={() => {}}
    />
  ),
};

export const ErrorState: StoryObj = {
  render: () => (
    <DataTable<User>
      id="users-error"
      caption="User list"
      columns={columns}
      filters={filters}
      rows={[]}
      rowKey={(u) => u.id}
      error="Failed to load users."
      sort={null}
      onSortChange={() => {}}
      filterValues={{}}
      onFilterChange={() => {}}
      hasPrev={false}
      hasNext={false}
      onPrev={() => {}}
      onNext={() => {}}
    />
  ),
};
