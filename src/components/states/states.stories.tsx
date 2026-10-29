// CSF stories for the shared state components (issue #106). The local CSF
// stub this file once carried is gone: @storybook/react-vite is now a
// devDependency, so the real Meta/StoryObj types are used and the default
// export is a static object literal Storybook's indexer can evaluate.
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { InlineError } from './InlineError';
import { PageError } from './PageError';
import { QueryState } from './QueryState';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'Components/States',
  component: Skeleton,
  decorators: [(story: () => ReactNode) => <MemoryRouter>{story()}</MemoryRouter>],
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;

// These stories supply every prop through the render closure instead of
// `args`, so a full StoryObj would not fit; `render` stays required while
// any extra fields are typed against the real story type.
type Story = { render: () => ReactNode } & Partial<StoryObj<typeof meta>>;

export const LoadingSkeleton: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <Skeleton lines={4} label="Loading your orders" />
    </div>
  ),
};

export const EmptyWithNextAction: Story = {
  render: () => (
    <EmptyState
      title="No prescriptions or lab orders yet"
      description="Orders issued after a consultation appear here, newest first."
      action={{ label: 'Back to your care hub', to: '/patient' }}
    />
  ),
};

export const EmptyPageSize: Story = {
  render: () => (
    <EmptyState
      size="page"
      title="No appointments are scheduled for today"
      description="Booked visits appear here on the day, with the patient's intake form attached."
      action={{ label: 'Review your messages', to: '/doctor/messages' }}
    />
  ),
};

export const InlineWithRetry: Story = {
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <InlineError
        message="We couldn't reach the server. Check your connection and try again."
        onRetry={() => {}}
      />
    </div>
  ),
};

export const InlineWithoutRetry: Story = {
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <InlineError title={null} message="This isn't available any more." />
    </div>
  ),
};

export const PageLevelError: Story = {
  render: () => (
    <PageError
      title="Your orders couldn't be loaded"
      message="The server had a problem. Try again in a moment."
      onRetry={() => {}}
      fallback={{ label: 'Back to your care hub', to: '/patient' }}
    />
  ),
};

export const QueryStateLoading: Story = {
  render: () => (
    <QueryState result={{ isPending: true, isError: false, error: null, data: undefined }}>
      <p>Loaded content</p>
    </QueryState>
  ),
};

export const QueryStateEmpty: Story = {
  render: () => (
    <QueryState
      result={{ isPending: false, isError: false, error: null, data: [] as string[] }}
      isEmpty={(items) => items.length === 0}
      empty={
        <EmptyState
          title="No threads match the current filter"
          description="Nothing in this view right now — the other filters may have threads waiting."
          action={{ label: 'Show all threads', onClick: () => {} }}
        />
      }
    >
      <p>Loaded content</p>
    </QueryState>
  ),
};

export const QueryStateError: Story = {
  render: () => (
    <QueryState
      result={{
        isPending: false,
        isError: true,
        error: new Error('offline'),
        data: undefined,
      }}
    >
      <p>Loaded content</p>
    </QueryState>
  ),
};
