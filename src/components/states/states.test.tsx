import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/render';
import { ApiError, ApiTimeoutError } from '../../services/api-client';
import { EmptyState } from './EmptyState';
import { InlineError } from './InlineError';
import { PageError } from './PageError';
import { QueryState, queryErrorMessage } from './QueryState';
import { Skeleton } from './Skeleton';

function result<T>(overrides: Partial<Parameters<typeof QueryState<T>>[0]['result']> = {}) {
  return {
    isPending: false,
    isError: false,
    error: null,
    data: undefined as T | undefined,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('Skeleton', () => {
  it('announces a loading status while hiding the decorative bars', () => {
    const { container } = render(<Skeleton lines={2} label="Loading your orders" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading your orders…');
    // The bars themselves are decorative — an aria-hidden wrapper keeps them
    // out of the accessibility tree.
    const visual = container.querySelector('[aria-hidden="true"]');
    expect(visual).not.toBeNull();
    expect(visual?.children).toHaveLength(2);
  });
});

describe('EmptyState', () => {
  it('always offers the next action as a link', () => {
    render(
      <EmptyState
        title="No orders yet"
        description="Orders appear here after a consultation."
        action={{ label: 'Book an appointment', to: '/patient' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'No orders yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book an appointment' })).toHaveAttribute('href', '/patient');
  });

  it('renders a button action when the next step does not navigate', async () => {
    const onClick = vi.fn();
    render(<EmptyState title="No matches" action={{ label: 'Clear filters', onClick }} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('InlineError', () => {
  it('shows the message, alerts, and retries on demand', async () => {
    const onRetry = vi.fn();
    render(<InlineError message="Network unavailable" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when retrying cannot help', () => {
    render(<InlineError message="This isn't available any more." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('PageError', () => {
  it('offers a retry and a way out of the failed route', () => {
    render(
      <PageError
        title="Your orders couldn't be loaded"
        message="The server had a problem."
        onRetry={vi.fn()}
        fallback={{ label: 'Back to your care hub', to: '/patient' }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Your orders couldn't be loaded");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your care hub' })).toHaveAttribute('href', '/patient');
  });
});

describe('QueryState', () => {
  it('renders a skeleton while pending, children once loaded', () => {
    const { rerender } = render(
      <QueryState result={result<string[]>({ isPending: true })}>
        <p>Loaded</p>
      </QueryState>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Loaded')).not.toBeInTheDocument();

    rerender(
      <QueryState result={result<string[]>({ data: ['a'] })}>
        {(data) => <p>Loaded {data.length}</p>}
      </QueryState>,
    );
    expect(screen.getByText('Loaded 1')).toBeInTheDocument();
  });

  it('renders the derived error message with a retry', async () => {
    const refetch = vi.fn();
    render(
      <QueryState
        result={result({ isError: true, error: new ApiError('Boom', 500), refetch })}
      >
        <p>never</p>
      </QueryState>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('The server had a problem');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('uses the caller empty state only when the data is genuinely empty', () => {
    const { rerender } = render(
      <QueryState
        result={result({ data: [] })}
        isEmpty={(items) => items.length === 0}
        empty={<EmptyState title="No threads" action={{ label: 'Refresh', onClick: vi.fn() }} />}
      >
        <p>List</p>
      </QueryState>,
    );
    expect(screen.getByRole('heading', { name: 'No threads' })).toBeInTheDocument();

    rerender(
      <QueryState
        result={result({ data: ['a'] })}
        isEmpty={(items) => items.length === 0}
        empty={<EmptyState title="No threads" action={{ label: 'Refresh', onClick: vi.fn() }} />}
      >
        <p>List</p>
      </QueryState>,
    );
    expect(screen.getByText('List')).toBeInTheDocument();
  });

  it('does not replace loaded data with a skeleton while refetching', () => {
    // `isPending` is only true for the first load; a background refetch keeps
    // the rows on screen.
    render(
      <QueryState result={result({ data: ['kept'], isPending: false })}>
        <p>Rows: 1</p>
      </QueryState>,
    );
    expect(screen.getByText('Rows: 1')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders a page-level error for a route with nothing else to show', () => {
    render(
      <QueryState
        result={result({ isError: true, error: new Error('offline') })}
        errorLayout="page"
        errorTitle="Payments couldn't be loaded"
        fallback={{ label: 'Back', to: '/' }}
      >
        <p>never</p>
      </QueryState>,
    );
    expect(screen.getByRole('heading', { name: "Payments couldn't be loaded" })).toBeInTheDocument();
  });
});

describe('queryErrorMessage', () => {
  it('turns each failure kind into something a patient can act on', () => {
    expect(queryErrorMessage(new ApiTimeoutError('timeout', '/orders', 1000))).toMatch(/taking too long/i);
    expect(queryErrorMessage(new ApiError('no network', 0))).toMatch(/couldn't reach the server/i);
    expect(queryErrorMessage(new ApiError('forbidden', 403))).toMatch(/don't have access/i);
    expect(queryErrorMessage(new ApiError('missing', 404))).toMatch(/isn't available/i);
    expect(queryErrorMessage(new ApiError('down', 503))).toMatch(/server had a problem/i);
    expect(queryErrorMessage(new ApiError('Bad request detail', 422))).toBe('Bad request detail');
    expect(queryErrorMessage(new Error('plain failure'))).toBe('plain failure');
    expect(queryErrorMessage(undefined)).toBe('Something went wrong.');
  });
});
