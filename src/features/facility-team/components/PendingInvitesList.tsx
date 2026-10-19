import { Button } from '../../../components/Button';
import type { FacilityInvite } from '../../../types/models';
import styles from './FacilityTeam.module.css';

interface PendingInvitesListProps {
  invites: FacilityInvite[];
  isOwner: boolean;
  onResend: (inviteId: string) => Promise<unknown>;
  onRevoke: (inviteId: string) => Promise<unknown>;
  isResending: boolean;
  isRevoking: boolean;
}

export function PendingInvitesList({
  invites,
  isOwner,
  onResend,
  onRevoke,
  isResending,
  isRevoking,
}: PendingInvitesListProps) {
  // If not owner, do not render pending invites (hidden for staff)
  if (!isOwner) return null;

  return (
    <section className={styles.card} aria-labelledby="invites-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="invites-heading">Pending invitations</h2>
          <p className={styles.headerSubtitle}>
            Outstanding invitations awaiting acceptance by invited staff.
          </p>
        </div>
      </div>

      {invites.length === 0 ? (
        <div className={styles.emptyState}>No pending invitations</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable} aria-label="Pending facility invitations">
            <thead>
              <tr>
                <th scope="col">Invited email</th>
                <th scope="col">Role</th>
                <th scope="col">Invited by</th>
                <th scope="col">Sent</th>
                <th scope="col">Expires</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td><strong>{invite.email}</strong></td>
                  <td>
                    <span
                      className={`${styles.memberRoleBadge} ${
                        invite.role === 'owner' ? styles.badgeOwner : styles.badgeStaff
                      }`}
                    >
                      {invite.role}
                    </span>
                  </td>
                  <td>{invite.invitedBy}</td>
                  <td>{new Date(invite.invitedAt).toLocaleDateString()}</td>
                  <td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                  <td className={styles.actionCell}>
                    <div className={styles.buttonGroup}>
                      <Button
                        variant="secondary"
                        onClick={() => onResend(invite.id)}
                        loading={isResending}
                        aria-label={`Resend invite to ${invite.email}`}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.2rem 0.6rem' }}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => onRevoke(invite.id)}
                        loading={isRevoking}
                        aria-label={`Revoke invite for ${invite.email}`}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.2rem 0.6rem', color: '#b3261e' }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
