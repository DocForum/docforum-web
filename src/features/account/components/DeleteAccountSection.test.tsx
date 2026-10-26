import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import userEvent from '@testing-library/user-event';
import { DeleteAccountSection } from './DeleteAccountSection';
import * as accountService from '../../../services/account-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../services/account-service');

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', email: 'patient@docforum.test', role: 'patient', createdAt: '', updatedAt: '' },
      accessToken: 'test-token',
    });
    useProfileStore.setState({
      profiles: [{ id: 'p1', fullName: 'Test Patient', isSelf: true }],
      selectedProfileId: 'p1',
    });
  });

  it('renders retention explanations and data export recommendation', () => {
    render(<DeleteAccountSection />);

    expect(screen.getByRole('heading', { name: /delete account/i })).toBeInTheDocument();
    expect(screen.getByText(/permanently deleted & anonymized/i)).toBeInTheDocument();
    expect(screen.getByText(/retained by statutory obligation/i)).toBeInTheDocument();
    expect(screen.getByText(/export your records first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to delete account/i })).toBeInTheDocument();
  });

  it('gates the deletion button until password and DELETE confirmation are provided', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountSection />);

    await user.click(screen.getByRole('button', { name: /proceed to delete account/i }));

    const deleteBtn = screen.getByRole('button', { name: /permanently delete account/i });
    expect(deleteBtn).toBeDisabled();

    const passwordInput = screen.getByLabelText(/confirm your password/i);
    const confirmInput = screen.getByLabelText(/type delete to confirm/i);

    // Type password only
    await user.type(passwordInput, 'mysecretpassword');
    expect(deleteBtn).toBeDisabled();

    // Type wrong confirmation
    await user.type(confirmInput, 'delete');
    expect(deleteBtn).toBeDisabled();

    // Type DELETE in caps
    await user.clear(confirmInput);
    await user.type(confirmInput, 'DELETE');
    expect(deleteBtn).toBeEnabled();
  });

  it('displays error message when backend blocks deletion (e.g. active orders/escrows)', async () => {
    vi.mocked(accountService.deleteAccount).mockRejectedValue(
      new ApiError('Cannot delete account while you have active orders or unreleased escrows.', 409, undefined, {
        code: 'ACCOUNT_DELETE_BLOCKED',
      }),
    );

    const user = userEvent.setup();
    render(<DeleteAccountSection />);

    await user.click(screen.getByRole('button', { name: /proceed to delete account/i }));

    await user.type(screen.getByLabelText(/confirm your password/i), 'mysecretpassword');
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE');

    const deleteBtn = screen.getByRole('button', { name: /permanently delete account/i });
    await user.click(deleteBtn);

    expect(
      await screen.findByText(/cannot be deleted while orders or funded payments are still active/i),
    ).toBeInTheDocument();
  });

  it('clears all client state and navigates to /account-deleted on success', async () => {
    vi.mocked(accountService.deleteAccount).mockResolvedValue({
      success: true,
      message: 'Account deleted successfully',
      deletedAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    render(<DeleteAccountSection />);

    await user.click(screen.getByRole('button', { name: /proceed to delete account/i }));

    await user.type(screen.getByLabelText(/confirm your password/i), 'mysecretpassword');
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE');

    await user.click(screen.getByRole('button', { name: /permanently delete account/i }));

    await waitFor(() => {
      expect(accountService.deleteAccount).toHaveBeenCalledWith('mysecretpassword', 'DELETE', 'test-token');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useProfileStore.getState().profiles).toEqual([]);
      expect(mockNavigate).toHaveBeenCalledWith('/account-deleted');
    });
  });
});
