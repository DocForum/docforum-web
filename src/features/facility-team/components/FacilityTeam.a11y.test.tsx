import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from '../../../test/render';
import { FacilityTeamView, DEFAULT_MOCK_MEMBERS, DEFAULT_MOCK_INVITES } from './FacilityTeamView';
import { useAuthStore } from '../../../store/auth-store';
import * as teamService from '../../../services/facility-team-service';

vi.mock('../../../services/facility-team-service');

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'test-token',
    user: { id: 'user-owner-1', email: 'evelyn.reed@centralpharmacy.org', role: 'facility', createdAt: '', updatedAt: '' },
  });
  vi.mocked(teamService.listFacilityMembers).mockResolvedValue(DEFAULT_MOCK_MEMBERS);
  vi.mocked(teamService.listFacilityInvites).mockResolvedValue(DEFAULT_MOCK_INVITES);
});

describe('Facility team accessibility (#90)', () => {
  it('has no detectable axe violations', async () => {
    const { container } = render(<FacilityTeamView isOwnerOverride />);
    await screen.findByRole('heading', { name: /facility team & accounts/i });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('captions both data tables and uses column headers', async () => {
    render(<FacilityTeamView isOwnerOverride />);
    await screen.findByRole('heading', { name: /facility members/i });

    expect(
      screen.getByRole('table', { name: /team members with their role and join date/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /pending facility invitations/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /dr\. evelyn reed/i })).toBeInTheDocument();
  });

  it('traps focus in the invite dialog and restores it to the trigger on Escape', async () => {
    render(<FacilityTeamView isOwnerOverride />);
    const trigger = await screen.findByRole('button', { name: /\+ invite staff member/i });

    await userEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: /invite team member/i });
    expect(dialog).toBeInTheDocument();
    // Initial focus lands on the first control in the dialog.
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toHaveFocus());

    // Shift+Tab from the first control wraps to the last control.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: /^send invite$/i })).toHaveFocus();

    // Escape closes the dialog and returns focus to the trigger.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
