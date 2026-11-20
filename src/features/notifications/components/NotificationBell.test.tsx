import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../../test/render';
import { makeNotification } from '../../../test/factories';
import * as notificationsService from '../../../services/notifications-service';
import type { NotificationPage } from '../../../types/models';
import { NotificationBell } from './NotificationBell';

vi.mock('../../../services/notifications-service', () => ({
  NOTIFICATIONS_PAGE_SIZE: 20,
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getNotificationStreamTicket: vi.fn(),
}));

function page(overrides: Partial<NotificationPage> = {}): NotificationPage {
  return {
    items: [],
    nextCursor: null,
    unreadCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(notificationsService.listNotifications).mockReset();
  vi.mocked(notificationsService.markNotificationRead).mockReset();
  vi.mocked(notificationsService.markAllNotificationsRead).mockReset();
  vi.mocked(notificationsService.getNotificationStreamTicket).mockReset();
  // No SSE in tests: the bell must work from the query alone.
  vi.mocked(notificationsService.getNotificationStreamTicket).mockRejectedValue(
    new Error('stream unavailable'),
  );
});

describe('NotificationBell', () => {
  it('shows the unread count and opens a dropdown of the newest notifications', async () => {
    vi.mocked(notificationsService.listNotifications).mockResolvedValue(
      page({
        unreadCount: 3,
        items: [
          makeNotification({ id: 'n1', title: 'Appointment confirmed', link: '/patient/appointments' }),
          makeNotification({ id: 'n2', kind: 'result_ready', title: 'Result ready', link: '/patient/records' }),
        ],
      }),
    );

    renderWithProviders(<NotificationBell />, { role: 'patient' });

    const bell = await screen.findByRole('button', { name: /notifications, 3 unread/i });
    expect(bell).toHaveAttribute('aria-expanded', 'false');

    await userEvent.setup().click(bell);

    expect(bell).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(bell.getAttribute('aria-controls')!);
    expect(panel).not.toBeNull();
    expect(within(panel!).getByText('Appointment confirmed')).toBeInTheDocument();

    const link = within(panel!).getByRole('link', { name: /appointment confirmed/i });
    expect(link).toHaveAttribute('href', '/patient/appointments');
    expect(within(panel!).getByRole('link', { name: /view all notifications/i })).toHaveAttribute(
      'href',
      '/notifications',
    );
  });

  it('closes on Escape and returns focus to the bell', async () => {
    vi.mocked(notificationsService.listNotifications).mockResolvedValue(
      page({ unreadCount: 1, items: [makeNotification({ id: 'n1' })] }),
    );

    renderWithProviders(<NotificationBell />, { role: 'patient' });
    const bell = await screen.findByRole('button', { name: /notifications, 1 unread/i });
    const user = userEvent.setup();

    await user.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(bell).toHaveFocus();
  });

  it('marks everything read and clears the badge', async () => {
    vi.mocked(notificationsService.listNotifications).mockResolvedValue(
      page({
        unreadCount: 2,
        items: [makeNotification({ id: 'n1' }), makeNotification({ id: 'n2' })],
      }),
    );
    vi.mocked(notificationsService.markAllNotificationsRead).mockResolvedValue({
      updated: 2,
      unreadCount: 0,
    });

    renderWithProviders(<NotificationBell />, { role: 'patient' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /notifications, 2 unread/i }));
    await user.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() =>
      expect(notificationsService.markAllNotificationsRead).toHaveBeenCalledTimes(1),
    );
    expect(
      await screen.findByRole('button', { name: /notifications, none unread/i }),
    ).toBeInTheDocument();
  });

  it('shows a calm empty state when there is nothing to read', async () => {
    vi.mocked(notificationsService.listNotifications).mockResolvedValue(page());

    renderWithProviders(<NotificationBell />, { role: 'facility' });
    const user = userEvent.setup();

    const bell = await screen.findByRole('button', { name: /notifications, none unread/i });
    await user.click(bell);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('renders nothing while signed out', () => {
    renderWithProviders(<NotificationBell />);
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
    expect(notificationsService.listNotifications).not.toHaveBeenCalled();
  });
});
