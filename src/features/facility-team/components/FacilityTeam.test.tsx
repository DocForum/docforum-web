import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { FacilityTeamView, DEFAULT_MOCK_MEMBERS, DEFAULT_MOCK_INVITES } from './FacilityTeamView';
import { FulfillmentQueueWithAttribution } from './FulfillmentQueueWithAttribution';
import { DEFAULT_MOCK_QUEUE } from '../../../pages/FacilityDashboardPage';
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
  vi.mocked(teamService.inviteFacilityMember).mockResolvedValue({
    id: 'inv-new',
    facilityId: 'fac-main',
    email: 'newbie@centralpharmacy.org',
    role: 'staff',
    invitedBy: 'evelyn.reed@centralpharmacy.org',
    invitedAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    status: 'pending',
  });
  vi.mocked(teamService.removeFacilityMember).mockResolvedValue({
    success: true,
    memberId: 'mem-2',
    sessionsRevoked: true,
    message: 'Member removed and sessions revoked',
  });
  vi.mocked(teamService.resendFacilityInvite).mockResolvedValue({
    ...DEFAULT_MOCK_INVITES[0],
    invitedAt: new Date().toISOString(),
  });
  vi.mocked(teamService.revokeFacilityInvite).mockResolvedValue({ success: true });
});

describe('Facility Staff Accounts (#51)', () => {
  describe('Facility Owner View', () => {
    it('renders owner view with member list, roles, and invite button', async () => {
      render(<FacilityTeamView isOwnerOverride={true} />);

      await screen.findByRole('heading', { name: /facility team & accounts/i });

      // Owner administrative banner
      expect(screen.getByText(/Facility Owner Access/i)).toBeInTheDocument();

      // Invite button is visible to owners
      expect(screen.getByRole('button', { name: /\+ invite staff member/i })).toBeInTheDocument();

      // Verify members are listed with their roles
      expect(screen.getByText('Dr. Evelyn Reed')).toBeInTheDocument();
      expect(screen.getByText('Marcus Vance, PharmD')).toBeInTheDocument();
      expect(screen.getByText('Aisha Patel')).toBeInTheDocument();

      // Verify pending invitations table is displayed
      expect(screen.getByRole('heading', { name: /pending invitations/i })).toBeInTheDocument();
      expect(screen.getByText('david.kim@centralpharmacy.org')).toBeInTheDocument();
    });

    it('opens invite modal and submits a staff invitation', async () => {
      render(<FacilityTeamView isOwnerOverride={true} />);

      const inviteBtn = await screen.findByRole('button', { name: /\+ invite staff member/i });
      await userEvent.click(inviteBtn);

      const modalHeading = screen.getByRole('heading', { name: /invite team member/i });
      expect(modalHeading).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email address/i);
      await userEvent.type(emailInput, 'newbie@centralpharmacy.org');

      const submitBtn = screen.getByRole('button', { name: /^send invite$/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(teamService.inviteFacilityMember).toHaveBeenCalledWith(
          'fac-main',
          { email: 'newbie@centralpharmacy.org', role: 'staff' },
          'test-token',
        );
      });
    });

    it('prevents removing the last owner and displays appropriate protection', async () => {
      render(<FacilityTeamView isOwnerOverride={true} />);

      await screen.findByRole('heading', { name: /facility members/i });

      // In DEFAULT_MOCK_MEMBERS, Evelyn Reed is the only owner (1 owner total)
      const removeReedBtn = screen.getByRole('button', { name: /remove member dr\. evelyn reed/i });
      expect(removeReedBtn).toBeDisabled();
      expect(removeReedBtn).toHaveAttribute('title', 'Cannot remove the last owner of a facility');

      // Staff member removal button is enabled
      const removeVanceBtn = screen.getByRole('button', { name: /remove member marcus vance/i });
      expect(removeVanceBtn).not.toBeDisabled();
    });

    it('opens removal confirmation with session revocation warning and proceeds', async () => {
      render(<FacilityTeamView isOwnerOverride={true} />);

      await screen.findByRole('heading', { name: /facility members/i });

      const removeVanceBtn = screen.getByRole('button', { name: /remove member marcus vance/i });
      await userEvent.click(removeVanceBtn);

      // Verify modal description and session revocation warning
      expect(screen.getByRole('heading', { name: /remove team member/i })).toBeInTheDocument();
      expect(screen.getByText(/Removing a member immediately signs them out and revokes all active backend sessions/i)).toBeInTheDocument();

      // Confirm removal
      const confirmBtn = screen.getByRole('button', { name: /^remove member$/i });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(teamService.removeFacilityMember).toHaveBeenCalledWith('fac-main', 'mem-2', 'test-token');
      });
    });

    it('allows resending and revoking pending invitations', async () => {
      render(<FacilityTeamView isOwnerOverride={true} />);

      const resendBtn = await screen.findByRole('button', { name: /resend invite to david\.kim/i });
      await userEvent.click(resendBtn);
      expect(teamService.resendFacilityInvite).toHaveBeenCalledWith('fac-main', 'inv-1', 'test-token');

      const revokeBtn = screen.getByRole('button', { name: /revoke invite for david\.kim/i });
      await userEvent.click(revokeBtn);
      expect(teamService.revokeFacilityInvite).toHaveBeenCalledWith('fac-main', 'inv-1', 'test-token');
    });
  });

  describe('Staff View (Read-Only)', () => {
    it('hides owner-only actions (invite, remove, pending invites) for staff users', async () => {
      render(<FacilityTeamView isOwnerOverride={false} />);

      await screen.findByRole('heading', { name: /facility team & accounts/i });

      // Displays read-only staff notice
      expect(screen.getByText(/Staff Member View \(Read-only\)/i)).toBeInTheDocument();

      // Owner-only actions MUST be hidden
      expect(screen.queryByRole('button', { name: /\+ invite staff member/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove member/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /pending invitations/i })).not.toBeInTheDocument();

      // Read-only member list is still visible
      expect(screen.getByText('Dr. Evelyn Reed')).toBeInTheDocument();
      expect(screen.getByText('Marcus Vance, PharmD')).toBeInTheDocument();
    });
  });

  describe('Fulfillment Queue with Action Attribution', () => {
    it('displays who performed each fulfillment action in the queue', () => {
      const onAction = vi.fn().mockResolvedValue(undefined);
      render(
        <FulfillmentQueueWithAttribution
          items={DEFAULT_MOCK_QUEUE}
          onAction={onAction}
          isUpdating={false}
        />,
      );

      // Verify fulfilled prescription shows dispensing doctor attribution
      expect(screen.getByText('Amoxicillin 500mg (30 capsules)')).toBeInTheDocument();
      expect(screen.getByText('Dr. Evelyn Reed')).toBeInTheDocument();
      expect(screen.getByText(/Dispensed by/i)).toBeInTheDocument();

      // Verify fulfilled lab order shows phlebotomist/pharmacist attribution
      expect(screen.getByText('Fasting Lipid Panel & HbA1c')).toBeInTheDocument();
      expect(screen.getByText('Marcus Vance, PharmD')).toBeInTheDocument();
      expect(screen.getByText(/Sample collected by/i)).toBeInTheDocument();

      // Verify pending item shows action buttons
      expect(screen.getByText('Metformin 850mg (60 tablets)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dispense & fulfill/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('triggers fulfillment action when staff dispenses pending item', async () => {
      const onAction = vi.fn().mockResolvedValue(undefined);
      render(
        <FulfillmentQueueWithAttribution
          items={DEFAULT_MOCK_QUEUE}
          onAction={onAction}
          isUpdating={false}
        />,
      );

      const dispenseBtn = screen.getByRole('button', { name: /dispense & fulfill/i });
      await userEvent.click(dispenseBtn);

      expect(onAction).toHaveBeenCalledWith('queue-3', 'fulfilled');
    });
  });
});
