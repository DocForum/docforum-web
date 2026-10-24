// CSF stories for the DataTable component (issue #97). The local CSF
// stubs this file once carried are gone: @storybook/react-vite is now a
// devDependency, so the real Meta/StoryObj types are used and the default
// export is a static object literal Storybook's indexer can evaluate.

import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { DataTable, type ColumnDefinition, type FilterDefinition } from './DataTable';

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

const meta = {
  title: 'Components/DataTable',
  component: DataTable,
  decorators: [
    (story: () => ReactNode) => <MemoryRouter>{story()}</MemoryRouter>,
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable>;

export default meta;

// These stories supply every prop through the render closure instead of
// `args`, so a full StoryObj (which requires `args` for DataTable's
// required props) would not fit. `render` stays required (as in the stub
// this file shipped with) while any extra fields are typed against the
// real story type.
type Story = { render: () => ReactNode } & Partial<StoryObj<typeof meta>>;

// ─── Stories ─────────────────────────────────────────────────────────────

export const Default: Story = {
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

export const SortedByName: Story = {
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

export const Loading: Story = {
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

export const ErrorState: Story = {
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
