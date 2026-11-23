import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../../test/render';
import { SessionsSection } from './SessionsSection';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as authService from '../../../services/auth-service';
import type { ActiveSession } from '../../../types/models';

vi.mock('../../../services/auth-service');

const now = new Date().toISOString();

const sessions: ActiveSession[] = [
  {
    id: 'sess-current',
    device: 'Chrome on Linux',
    approximateLocation: 'Lagos, Nigeria',
    lastActiveAt: now,
    createdAt: now,
    isCurrent: true,
  },
  {
    id: 'sess-kiosk',
    device: 'Clinic kiosk · Firefox',
    approximateLocation: 'Abuja, Nigeria',
    lastActiveAt: now,
    createdAt: now,
    isCurrent: false,
  },
];

function renderSection() {
  return render(
    <Routes>
      <Route path="/" element={<SessionsSection />} />
      <Route path="/login" element={<p>Login screen</p>} />
    </Routes>,
  );
}

async function confirmInDialog(user: ReturnType<typeof userEvent.setup>, label: string) {
  const dialog = screen.getByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: label }));
}

describe('SessionsSection', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u-1',
        email: 'a@b.com',
        role: 'patient',
        createdAt: now,
        updatedAt: now,
      },
      accessToken: 'token',
    });
    vi.mocked(authService.listSessions).mockReset().mockResolvedValue(sessions);
    vi.mocked(authService.revokeSession).mockReset().mockResolvedValue(undefined);
    vi.mocked(authService.revokeOtherSessions).mockReset().mockResolvedValue({ revokedCount: 1 });
  });

  it('lists sessions, marks the current device, and shows no IP addresses', async () => {
    renderSection();

    expect(await screen.findByText('Chrome on Linux')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    expect(screen.getByText(/Clinic kiosk · Firefox/)).toBeInTheDocument();
    expect(screen.getByText(/Abuja, Nigeria/)).toBeInTheDocument();

    expect(document.body.textContent).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    expect(screen.queryByText(/IP address/i)).not.toBeInTheDocument();
  });

  it('signs out a single other session after confirmation', async () => {
    const user = userEvent.setup();
    renderSection();

    const row = (await screen.findByText(/Clinic kiosk · Firefox/)).closest('li');
    expect(row).not.toBeNull();
    await user.click(within(row!).getByRole('button', { name: 'Sign out' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Sign out Clinic kiosk · Firefox?');
    await confirmInDialog(user, 'Sign out');

    expect(authService.revokeSession).toHaveBeenCalledWith('sess-kiosk', 'token');
    expect(await screen.findByText('Signed out Clinic kiosk · Firefox.')).toBeInTheDocument();
  });

  it('signs out every other session', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Sign out everywhere else' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Sign out all other devices?');
    await confirmInDialog(user, 'Sign out');

    expect(authService.revokeOtherSessions).toHaveBeenCalledWith('token');
    expect(await screen.findByText('Signed out 1 other session.')).toBeInTheDocument();
  });

  it('logs out cleanly when the current session is revoked', async () => {
    vi.mocked(authService.listSessions).mockResolvedValue([sessions[0]]);
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Sign out this device' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Sign out this device?');
    await confirmInDialog(user, 'Sign out');

    expect(await screen.findByText('Login screen')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('treats a session revoked elsewhere as already gone, not an error', async () => {
    vi.mocked(authService.revokeSession).mockRejectedValue(new ApiError('Not found', 404));
    const user = userEvent.setup();
    renderSection();

    const row = (await screen.findByText(/Clinic kiosk · Firefox/)).closest('li');
    await user.click(within(row!).getByRole('button', { name: 'Sign out' }));
    await confirmInDialog(user, 'Sign out');

    expect(await screen.findByText('That session was already signed out.')).toBeInTheDocument();
    await waitFor(() => expect(authService.listSessions).toHaveBeenCalledTimes(2));
  });
});
