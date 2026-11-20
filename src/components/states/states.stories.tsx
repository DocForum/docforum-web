// CSF 3 stories for the shared state components (issue #106).
// Same stub approach as DataTable.stories.tsx: they are written in Component
// Story Format so Storybook picks them up once #97 installs it, and they
// typecheck today without @storybook/react.
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { InlineError } from './InlineError';
import { PageError } from './PageError';
import { QueryState } from './QueryState';
import { Skeleton } from './Skeleton';

interface Meta {
  title: string;
  component: typeof Skeleton;
  decorators: ((story: () => ReactNode) => ReactNode)[];
  tags: string[];
}

type StoryObj = { render: () => ReactNode };

function defineMeta(meta: Meta): Meta {
  return meta;
}

const meta = defineMeta({
  title: 'Components/States',
  component: Skeleton,
  decorators: [(story) => <MemoryRouter>{story()}</MemoryRouter>],
  tags: ['autodocs'],
});

export default meta;

export const LoadingSkeleton: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <Skeleton lines={4} label="Loading your orders" />
    </div>
  ),
};

export const EmptyWithNextAction: StoryObj = {
  render: () => (
    <EmptyState
      title="No prescriptions or lab orders yet"
      description="Orders issued after a consultation appear here, newest first."
      action={{ label: 'Back to your care hub', to: '/patient' }}
    />
  ),
};

export const EmptyPageSize: StoryObj = {
  render: () => (
    <EmptyState
      size="page"
      title="No appointments are scheduled for today"
      description="Booked visits appear here on the day, with the patient's intake form attached."
      action={{ label: 'Review your messages', to: '/doctor/messages' }}
    />
  ),
};

export const InlineWithRetry: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <InlineError
        message="We couldn't reach the server. Check your connection and try again."
        onRetry={() => {}}
      />
    </div>
  ),
};

export const InlineWithoutRetry: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <InlineError title={null} message="This isn't available any more." />
    </div>
  ),
};

export const PageLevelError: StoryObj = {
  render: () => (
    <PageError
      title="Your orders couldn't be loaded"
      message="The server had a problem. Try again in a moment."
      onRetry={() => {}}
      fallback={{ label: 'Back to your care hub', to: '/patient' }}
    />
  ),
};

export const QueryStateLoading: StoryObj = {
  render: () => (
    <QueryState result={{ isPending: true, isError: false, error: null, data: undefined }}>
      <p>Loaded content</p>
    </QueryState>
  ),
};

export const QueryStateEmpty: StoryObj = {
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

export const QueryStateError: StoryObj = {
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
