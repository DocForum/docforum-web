import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { NotificationSettings } from './NotificationSettings';
import { defaultPreferencesForRole } from '../preferences';
import * as notificationsService from '../../../services/notification-preferences-service';
import { useAuthStore } from '../../../store/auth-store';

vi.mock('../../../services/notification-preferences-service');

const updateMock = vi.mocked(notificationsService.updateNotificationPreferences);

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'test-token',
      user: {
        id: 'user-patient',
        email: 'patient@example.test',
        role: 'patient',
        createdAt: '',
        updatedAt: '',
      },
    });
    vi.mocked(notificationsService.getNotificationPreferences).mockResolvedValue(
      defaultPreferencesForRole('patient'),
    );
    updateMock.mockResolvedValue(defaultPreferencesForRole('patient'));
  });

  it('renders one labelled toggle per type and channel and locks safety-critical rows', async () => {
    render(<NotificationSettings />);

    const email = await screen.findByRole('switch', { name: 'Appointment reminders via Email' });
    expect(email).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Appointment reminders via SMS' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Appointment reminders via In-app' })).toBeInTheDocument();

    const locked = screen.getByRole('switch', { name: 'Critical lab results via Email' });
    expect(locked).toBeDisabled();
    expect(locked).toBeChecked();
    expect(screen.getByText(/always delivered on every channel/i)).toBeInTheDocument();
  });

  it('saves a changed toggle immediately', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    const toggle = await screen.findByRole('switch', { name: 'Appointment reminders via Email' });
    await user.click(toggle);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        { preferences: [{ type: 'appointment_reminders', channel: 'email', enabled: false }] },
        'test-token',
      );
    });
  });

  it('rolls the optimistic toggle back when the save fails', async () => {
    updateMock.mockRejectedValueOnce(new Error('save failed'));
    const user = userEvent.setup();
    render(<NotificationSettings />);

    const toggle = await screen.findByRole('switch', { name: 'Appointment reminders via Email' });
    expect(toggle).toBeChecked();

    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/previous setting was restored/i);
    });
    expect(
      screen.getByRole('switch', { name: 'Appointment reminders via Email' }),
    ).toBeChecked();
  });

  it('saves quiet hours including the selected IANA zone', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    const enable = await screen.findByRole('switch', { name: 'Enable quiet hours' });
    await user.click(enable);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        {
          quietHours: {
            enabled: true,
            start: '21:00',
            end: '08:00',
            timeZone: expect.any(String),
          },
        },
        'test-token',
      );
    });
  });
});
