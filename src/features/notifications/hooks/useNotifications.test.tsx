import { describe, expect, it, vi } from 'vitest';
import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, server, waitFor } from '../../../test/render';
import { makeNotification } from '../../../test/factories';
import type { NotificationPage } from '../../../types/models';
import { useNotifications } from './useNotifications';

/** Small harness so the hook is driven the way a screen drives it. */
function Inbox() {
  const inbox = useNotifications();
  return (
    <div>
      <span data-testid="unread">{inbox.unreadCount}</span>
      <span data-testid="loading">{String(inbox.isLoading)}</span>
      <ul>
        {inbox.notifications.map((notification) => (
          <li key={notification.id}>{notification.title}</li>
        ))}
      </ul>
      <button type="button" onClick={() => inbox.markRead.mutate(inbox.notifications[0].id)}>
        Read first
      </button>
      <button type="button" onClick={() => inbox.markAllRead.mutate()}>
        Read all
      </button>
      <button type="button" onClick={() => void inbox.fetchMore()}>
        Load older
      </button>
    </div>
  );
}

function page(overrides: Partial<NotificationPage> = {}): NotificationPage {
  return { items: [], nextCursor: null, unreadCount: 0, ...overrides };
}

describe('useNotifications', () => {
  it('loads the newest page, pages with the cursor, and reads the badge from the server total', async () => {
    const newest = page({
      unreadCount: 9,
      nextCursor: 'cursor-2',
      items: [
        makeNotification({ id: 'n1', title: 'Newest' }),
        makeNotification({ id: 'n2', title: 'Second' }),
      ],
    });
    const older = page({
      unreadCount: 9,
      items: [makeNotification({ id: 'n3', title: 'Oldest' })],
    });

    server.use(
      http.get('*/notifications', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        return HttpResponse.json(cursor === 'cursor-2' ? older : newest);
      }),
    );

    renderWithProviders(<Inbox />, { role: 'patient' });

    expect(await screen.findByText('Newest')).toBeInTheDocument();
    expect(screen.getByTestId('unread')).toHaveTextContent('9');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Load older' }));

    expect(await screen.findByText('Oldest')).toBeInTheDocument();
    // The badge still shows the server's inbox-wide total, not the 3 rows.
    expect(screen.getByTestId('unread')).toHaveTextContent('9');
  });

  it('optimistically marks one read, then persists it', async () => {
    const readRequest = vi.fn();
    // Stateful, like the real API: the refetch after the mutation must reflect
    // the write, otherwise the assertion only proves the rollback works.
    let unreadCount = 2;
    server.use(
      http.get('*/notifications', () =>
        HttpResponse.json(
          page({
            unreadCount,
            items: [
              makeNotification({ id: 'n1', title: 'First' }),
              makeNotification({ id: 'n2', title: 'Second' }),
            ],
          }),
        ),
      ),
      http.post('*/notifications/:id/read', ({ params }) => {
        readRequest(params.id);
        unreadCount = 1;
        return HttpResponse.json(
          makeNotification({ id: String(params.id), title: 'First', readAt: new Date().toISOString() }),
        );
      }),
    );

    renderWithProviders(<Inbox />, { role: 'patient' });
    await screen.findByText('First');
    expect(screen.getByTestId('unread')).toHaveTextContent('2');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Read first' }));

    // Optimistic: the badge drops before the refetch lands.
    await waitFor(() => expect(screen.getByTestId('unread')).toHaveTextContent('1'));
    expect(readRequest).toHaveBeenCalledWith('n1');
  });

  it('marks everything read and zeroes the badge', async () => {
    const readAll = vi.fn();
    let unreadCount = 2;
    server.use(
      http.get('*/notifications', () =>
        HttpResponse.json(
          page({
            unreadCount,
            items: [makeNotification({ id: 'n1', title: 'First' }), makeNotification({ id: 'n2', title: 'Second' })],
          }),
        ),
      ),
      http.post('*/notifications/read-all', () => {
        readAll();
        unreadCount = 0;
        return HttpResponse.json({ updated: 2, unreadCount: 0 });
      }),
    );

    renderWithProviders(<Inbox />, { role: 'patient' });
    await screen.findByText('First');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Read all' }));

    await waitFor(() => expect(screen.getByTestId('unread')).toHaveTextContent('0'));
    expect(readAll).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed load so the screen can show an error with retry', async () => {
    server.use(
      http.get('*/notifications', () =>
        HttpResponse.json({ message: 'Mock API: notifications unavailable' }, { status: 503 }),
      ),
    );

    renderWithProviders(<Inbox />, { role: 'patient' });

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('unread')).toHaveTextContent('0');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('does not fetch while there is no session', async () => {
    const request = vi.fn();
    server.use(
      http.get('*/notifications', () => {
        request();
        return HttpResponse.json(page());
      }),
    );

    renderWithProviders(<Inbox />);
    // Give the query a tick to prove it stayed disabled.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(request).not.toHaveBeenCalled();
  });
});
