import { Button } from '../../../components/Button';
import { useFormat } from '../../../i18n/useFormat';
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
  const { formatDate } = useFormat();

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
          <table className={styles.dataTable}>
            <caption className="srOnly">
              Pending facility invitations with role, sender, send date and expiry
            </caption>
            <thead>
              <tr>
                <th scope="col">Invited email</th>
                <th scope="col">Role</th>
                <th scope="col">Invited by</th>
                <th scope="col">Sent</th>
                <th scope="col">Expires</th>
                <th scope="col" className={styles.actionCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <th scope="row"><strong>{invite.email}</strong></th>
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
                  <td>
                    <time dateTime={invite.invitedAt}>{formatDate(invite.invitedAt)}</time>
                  </td>
                  <td>
                    <time dateTime={invite.expiresAt}>{formatDate(invite.expiresAt)}</time>
                  </td>
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
