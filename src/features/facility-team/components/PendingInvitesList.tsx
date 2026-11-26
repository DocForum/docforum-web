import { useRef } from 'react';
import { useT } from '../../../i18n/useT';
import { Button } from '../../../components/Button';
import { LiveRegion } from '../../../components/LiveRegion';
import { useAnnouncer } from '../../../hooks/useAnnouncer';
import { useRowRemovalFocus } from '../../../hooks/useRowRemovalFocus';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDate } from '../../../i18n/time-zone';
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
  const t = useT();
  const { timeZone } = useTimeZone();
  const listRef = useRef<HTMLTableSectionElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { message, announce } = useAnnouncer();
  const { rememberRemovedRow, forgetRemovedRow } = useRowRemovalFocus(
    invites.map((invite) => invite.id),
    { containerRef: listRef, fallbackRef: headingRef },
  );

  // A revoked invite takes its row (and the focused button) with it: keep
  // focus on the neighbouring row and announce what happened (issue #245).
  const handleRevoke = (invite: FacilityInvite) => {
    rememberRemovedRow(invite.id);
    void onRevoke(invite.id).then(
      () =>
        announce(
          t('facilityTeam.inviteRevoked', 'Invitation to {email} was revoked.', { email: invite.email }),
        ),
      () => forgetRemovedRow(),
    );
  };

  // If not owner, do not render pending invites (hidden for staff)
  if (!isOwner) return null;

  return (
    <section className={styles.card} aria-labelledby="invites-heading">
      <LiveRegion message={message} />
      <div className={styles.cardHeader}>
        <div>
          <h2 id="invites-heading" ref={headingRef} tabIndex={-1}>
            {t('facilityTeam.invitesTitle', 'Pending invitations')}
          </h2>
          <p className={styles.headerSubtitle}>
            {t('facilityTeam.invitesSubtitle', 'Outstanding invitations awaiting acceptance by invited staff.')}
          </p>
        </div>
      </div>

      {invites.length === 0 ? (
        <div className={styles.emptyState}>{t('facilityTeam.noInvites', 'No pending invitations')}</div>
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
            <tbody ref={listRef}>
              {invites.map((invite) => (
                <tr key={invite.id} data-row-id={invite.id}>
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
                    <time dateTime={invite.invitedAt}>{formatDate(invite.invitedAt, timeZone)}</time>
                  </td>
                  <td>
                    <time dateTime={invite.expiresAt}>{formatDate(invite.expiresAt, timeZone)}</time>
                  </td>
                  <td className={styles.actionCell}>
                    <div className={styles.buttonGroup}>
                      <Button
                        variant="secondary"
                        onClick={() => onResend(invite.id)}
                        loading={isResending}
                        aria-label={`${t('facilityTeam.resend', 'Resend')} invite to ${invite.email}`}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.2rem 0.6rem' }}
                      >
                        {t('facilityTeam.resend', 'Resend')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleRevoke(invite)}
                        loading={isRevoking}
                        aria-label={`${t('facilityTeam.revoke', 'Revoke')} invite for ${invite.email}`}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.2rem 0.6rem', color: '#b3261e' }}
                      >
                        {t('facilityTeam.revoke', 'Revoke')}
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
