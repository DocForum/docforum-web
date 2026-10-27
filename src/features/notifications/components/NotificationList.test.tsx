import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '../../../test/render';
import { makeNotification } from '../../../test/factories';
import { NotificationList } from './NotificationList';

const baseProps = {
  role: 'patient' as const,
  onMarkRead: vi.fn(),
  onMarkAllRead: vi.fn(),
  unreadCount: 0,
};

describe('NotificationList', () => {
  it('renders each notification with its deep link, category and unread state', () => {
    renderWithProviders(
      <NotificationList
        {...baseProps}
        unreadCount={2}
        notifications={[
          makeNotification({
            id: 'n1',
            kind: 'appointment_booked',
            title: 'Appointment confirmed',
            body: '18 Oct at 09:00',
            link: '/patient/appointments',
          }),
          makeNotification({
            id: 'n2',
            kind: 'payment_escrowed',
            title: 'Payment held in escrow',
            link: '/payments',
            readAt: '2026-10-20T09:00:00.000Z',
          }),
        ]}
      />,
      { role: 'patient' },
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const first = within(items[0]);
    expect(first.getByRole('link')).toHaveAttribute('href', '/patient/appointments');
    expect(first.getByText('Appointment confirmed')).toBeInTheDocument();
    expect(first.getByText('Appointment')).toBeInTheDocument();
    expect(first.getByRole('button', { name: /mark "appointment confirmed" as read/i })).toBeInTheDocument();

    // A read row has no per-row action and is not highlighted.
    expect(items[1]).toHaveAttribute('data-unread', 'false');
    expect(within(items[1]).queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks one notification read', async () => {
    const onMarkRead = vi.fn();
    renderWithProviders(
      <NotificationList
        {...baseProps}
        onMarkRead={onMarkRead}
        unreadCount={1}
        notifications={[makeNotification({ id: 'n1', title: 'Result ready' })]}
      />,
      { role: 'patient' },
    );

    await userEvent.setup().click(screen.getByRole('button', { name: /mark "result ready" as read/i }));
    expect(onMarkRead).toHaveBeenCalledWith('n1');
  });

  it('marks everything read and disables the action when nothing is unread', async () => {
    const onMarkAllRead = vi.fn();
    const { rerender } = renderWithProviders(
      <NotificationList
        {...baseProps}
        onMarkAllRead={onMarkAllRead}
        unreadCount={1}
        notifications={[makeNotification()]}
      />,
      { role: 'patient' },
    );

    await userEvent.setup().click(screen.getByRole('button', { name: /mark all as read/i }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);

    rerender(
      <NotificationList {...baseProps} unreadCount={0} notifications={[makeNotification({ readAt: '2026-10-20T09:00:00.000Z' })]} />,
    );
    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeDisabled();
  });

  it('renders an unknown kind generically, and never links an unsafe payload link', () => {
    renderWithProviders(
      <NotificationList
        {...baseProps}
        unreadCount={1}
        notifications={[
          makeNotification({ id: 'n1', kind: 'brand_new_kind', title: 'Something happened', link: 'https://evil.example' }),
        ]}
      />,
      { role: 'patient' },
    );

    expect(screen.getByText('Something happened')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a loading skeleton, then an empty state with a next action', () => {
    const { rerender } = renderWithProviders(
      <NotificationList {...baseProps} notifications={[]} isLoading />,
      { role: 'doctor' },
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading notifications');

    rerender(<NotificationList {...baseProps} role="doctor" notifications={[]} />);
    expect(screen.getByRole('heading', { name: /all caught up/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to your dashboard/i })).toHaveAttribute(
      'href',
      '/doctor',
    );
  });

  it('offers a retry when loading failed', async () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <NotificationList {...baseProps} notifications={[]} error={new Error('offline')} onRetry={onRetry} />,
      { role: 'patient' },
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Your notifications couldn't be loaded.");
    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('loads older notifications from the page variant only', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = renderWithProviders(
      <NotificationList
        {...baseProps}
        notifications={[makeNotification()]}
        hasMore
        onLoadMore={onLoadMore}
      />,
      { role: 'patient' },
    );

    await userEvent.setup().click(screen.getByRole('button', { name: /load older notifications/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // The bell dropdown is compact: no "load older" control there.
    rerender(
      <NotificationList
        {...baseProps}
        variant="panel"
        notifications={[makeNotification()]}
        hasMore
        onLoadMore={onLoadMore}
      />,
    );
    expect(screen.queryByRole('button', { name: /load older/i })).not.toBeInTheDocument();
  });
});
