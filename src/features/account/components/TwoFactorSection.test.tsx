import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from '../../../test/render';
import { ApiError } from '../../../services/api-client';
import * as authService from '../../../services/auth-service';
import { useAuthStore } from '../../../store/auth-store';
import { TwoFactorSection } from './TwoFactorSection';

vi.mock('../../../services/auth-service');

describe('TwoFactorSection', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({
      accessToken: 'session-token',
      user: { id: 'user-1', email: 'person@example.test', role: 'patient', createdAt: '', updatedAt: '' },
    });
    vi.mocked(authService.getTwoFactorStatus).mockReset();
    vi.mocked(authService.setupTwoFactor).mockReset();
    vi.mocked(authService.enableTwoFactor).mockReset();
    vi.mocked(authService.disableTwoFactor).mockReset();
  });

  it('shows status and recovery codes after enabling', async () => {
    vi.mocked(authService.getTwoFactorStatus).mockResolvedValue({ enabled: false, unusedRecoveryCodes: 0 });
    vi.mocked(authService.setupTwoFactor).mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/DocForum:test?secret=JBSWY3DPEHPK3PXP',
    });
    vi.mocked(authService.enableTwoFactor).mockResolvedValue({ recoveryCodes: ['AAAAA-11111', 'BBBBB-22222'] });
    const user = userEvent.setup();
    const { container } = render(<TwoFactorSection />);

    await user.click(await screen.findByRole('button', { name: /set up two-factor authentication/i }));
    expect(await screen.findByAltText(/authenticator app setup qr code/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByLabelText(/six-digit authenticator code/i), '123456');
    await user.click(screen.getByRole('button', { name: /enable and show recovery codes/i }));

    expect(await screen.findByText('Two-factor authentication is on. 2 recovery codes remain unused.')).toBeInTheDocument();
    expect(screen.getByText('AAAAA-11111')).toBeInTheDocument();
    expect(authService.enableTwoFactor).toHaveBeenCalledWith('session-token', '123456');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps the session active when disabling fails with an invalid code', async () => {
    vi.mocked(authService.getTwoFactorStatus).mockResolvedValue({ enabled: true, unusedRecoveryCodes: 4 });
    vi.mocked(authService.disableTwoFactor).mockRejectedValue(
      new ApiError('Invalid code', 401, { code: 'INVALID_TOTP_CODE' }),
    );
    const user = userEvent.setup();
    render(<TwoFactorSection />);

    await user.type(await screen.findByLabelText(/code to turn off/i), 'wrong code');
    await user.click(screen.getByRole('button', { name: /turn off two-factor authentication/i }));

    expect(await screen.findByText(/account is still signed in/i)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe('session-token');
    expect(useAuthStore.getState().user).not.toBeNull();
    await waitFor(() => expect(authService.disableTwoFactor).toHaveBeenCalledWith('session-token', 'WRONGCODE'));
  });
});
