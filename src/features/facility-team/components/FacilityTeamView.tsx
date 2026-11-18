import { useState } from 'react';
import { useT } from '../../../i18n/useT';
import { Button } from '../../../components/Button';
import { Skeleton } from '../../../components/states/Skeleton';
import { FacilityMemberList } from './FacilityMemberList';
import { PendingInvitesList } from './PendingInvitesList';
import { InviteMemberModal } from './InviteMemberModal';
import {
  useFacilityMembers,
  useFacilityInvites,
  useInviteMember,
  useResendInvite,
  useRevokeInvite,
  useRemoveMember,
} from '../hooks/useFacilityTeam';
import { useAuthStore } from '../../../store/auth-store';
import type { FacilityMember, FacilityInvite, InviteMemberInput } from '../../../types/models';
import styles from './FacilityTeam.module.css';

// Fallback initial team data for preview/development when backend endpoint is not yet connected
export const DEFAULT_MOCK_MEMBERS: FacilityMember[] = [
  {
    id: 'mem-1',
    facilityId: 'fac-main',
    userId: 'user-owner-1',
    fullName: 'Dr. Evelyn Reed',
    email: 'evelyn.reed@centralpharmacy.org',
    role: 'owner',
    joinedAt: '2026-08-15T09:00:00Z',
    isCurrentUser: true,
  },
  {
    id: 'mem-2',
    facilityId: 'fac-main',
    userId: 'user-staff-1',
    fullName: 'Marcus Vance, PharmD',
    email: 'marcus.vance@centralpharmacy.org',
    role: 'staff',
    joinedAt: '2026-09-01T14:30:00Z',
    isCurrentUser: false,
  },
  {
    id: 'mem-3',
    facilityId: 'fac-main',
    userId: 'user-staff-2',
    fullName: 'Aisha Patel',
    email: 'aisha.patel@centralpharmacy.org',
    role: 'staff',
    joinedAt: '2026-09-20T11:15:00Z',
    isCurrentUser: false,
  },
];

export const DEFAULT_MOCK_INVITES: FacilityInvite[] = [
  {
    id: 'inv-1',
    facilityId: 'fac-main',
    email: 'david.kim@centralpharmacy.org',
    role: 'staff',
    invitedBy: 'evelyn.reed@centralpharmacy.org',
    invitedAt: '2026-10-15T16:00:00Z',
    expiresAt: '2026-10-22T16:00:00Z',
    status: 'pending',
  },
];

interface FacilityTeamViewProps {
  facilityId?: string;
  isOwnerOverride?: boolean;
}

export function FacilityTeamView({
  facilityId = 'fac-main',
  isOwnerOverride,
}: FacilityTeamViewProps) {
  const user = useAuthStore((state) => state.user);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const t = useT();

  const { data: membersData, isLoading: membersLoading } = useFacilityMembers(facilityId);

  // Resolved members: live data or mock preview fallback
  const members: FacilityMember[] = membersData ?? DEFAULT_MOCK_MEMBERS;

  // Determine if current user is an owner
  // If isOwnerOverride is provided (for testing/staff view demo), use that;
  // otherwise check if user matches an owner member or has owner role
  const isOwner =
    isOwnerOverride !== undefined
      ? isOwnerOverride
      : Boolean(
          members.find((m) => m.email === user?.email)?.role === 'owner' ||
          members.find((m) => m.isCurrentUser)?.role === 'owner'
        );

  const { data: invitesData } = useFacilityInvites(facilityId, isOwner);
  const invites: FacilityInvite[] = invitesData ?? (isOwner ? DEFAULT_MOCK_INVITES : []);

  const inviteMutation = useInviteMember(facilityId);
  const resendMutation = useResendInvite(facilityId);
  const revokeMutation = useRevokeInvite(facilityId);
  const removeMutation = useRemoveMember(facilityId);

  if (membersLoading) {
    return (
      <div className={styles.container}>
        <Skeleton lines={4} height="2.25rem" label="Loading facility team members" />
      </div>
    );
  }

  const handleInviteSubmit = async (input: InviteMemberInput) => {
    if (!isOwner) {
      throw new Error('Unauthorized: Only facility owners can send staff invitations.');
    }
    await inviteMutation.mutateAsync(input);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isOwner) {
      throw new Error('Unauthorized: Only facility owners can remove members.');
    }
    await removeMutation.mutateAsync(memberId);
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!isOwner) {
      throw new Error('Unauthorized: Only facility owners can resend invitations.');
    }
    await resendMutation.mutateAsync(inviteId);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!isOwner) {
      throw new Error('Unauthorized: Only facility owners can revoke invitations.');
    }
    await revokeMutation.mutateAsync(inviteId);
  };

  return (
    <section className={styles.container} aria-label="Facility team management">
      <header className={styles.header}>
<div className={styles.headerTitle}>
          <h1>{t('facilityTeam.title', 'Facility team & accounts')}</h1>
          <p className={styles.headerSubtitle}>
              {t('facilityTeam.subtitle', 'Manage staff members, roles, and invitation access for this facility.')}
            </p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteModalOpen(true)}>
            {t('facilityTeam.inviteButton', '+ Invite staff member')}
          </Button>
        )}
      </header>

      {/* Role Notice Banner */}
      {isOwner ? (
        <div className={`${styles.roleNotice} ${styles.roleNoticeOwner}`} role="status">
          <span aria-hidden="true">🛡️</span>
          <span>
            <strong>{t('facilityTeam.ownerNotice', 'Facility Owner Access:')}</strong> You have administrative permissions to invite new members, assign roles, and revoke account access.
          </span>
        </div>
      ) : (
        <div className={`${styles.roleNotice} ${styles.roleNoticeStaff}`} role="status">
          <span aria-hidden="true">ℹ️</span>
          <span>
            <strong>{t('facilityTeam.staffNotice', 'Staff Member View (Read-only):')}</strong> You have dispensing and fulfillment access. Only facility owners can invite or remove team members.
          </span>
        </div>
      )}

      {/* Members List */}
      <FacilityMemberList
        members={members}
        isOwner={isOwner}
        onRemoveMember={handleRemoveMember}
        isRemoving={removeMutation.isPending}
      />

      {/* Pending Invites (Owners only) */}
      {isOwner && (
        <PendingInvitesList
          invites={invites}
          isOwner={isOwner}
          onResend={handleResendInvite}
          onRevoke={handleRevokeInvite}
          isResending={resendMutation.isPending}
          isRevoking={revokeMutation.isPending}
        />
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInviteSubmit}
        isPending={inviteMutation.isPending}
        isOwner={isOwner}
      />
    </section>
  );
}
