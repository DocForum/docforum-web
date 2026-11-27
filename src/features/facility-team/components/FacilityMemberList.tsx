import { useRef, useState } from 'react';
import { useT } from '../../../i18n/useT';
import { Button } from '../../../components/Button';
import { LiveRegion } from '../../../components/LiveRegion';
import { useAnnouncer } from '../../../hooks/useAnnouncer';
import { useRowRemovalFocus } from '../../../hooks/useRowRemovalFocus';
import { RemoveMemberModal } from './RemoveMemberModal';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDate } from '../../../i18n/time-zone';
import type { FacilityMember } from '../../../types/models';
import styles from './FacilityTeam.module.css';

interface FacilityMemberListProps {
  members: FacilityMember[];
  isOwner: boolean;
  onRemoveMember: (memberId: string) => Promise<unknown>;
  isRemoving: boolean;
}

export function FacilityMemberList({
  members,
  isOwner,
  onRemoveMember,
  isRemoving,
}: FacilityMemberListProps) {
  const [selectedMember, setSelectedMember] = useState<FacilityMember | null>(null);
  const t = useT();
  const { timeZone } = useTimeZone();
  const listRef = useRef<HTMLTableSectionElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { message, announce } = useAnnouncer();
  const { rememberRemovedRow, forgetRemovedRow } = useRowRemovalFocus(
    members.map((member) => member.id),
    { containerRef: listRef, fallbackRef: headingRef },
  );

  const ownerCount = members.filter((m) => m.role === 'owner').length;

  // Removing a member unmounts the button that had focus: remember the row so
  // focus lands on its neighbour once the list settles (issue #245), and
  // announce the result for screen-reader users.
  const handleRemove = async (memberId: string) => {
    const removed = members.find((member) => member.id === memberId);
    rememberRemovedRow(memberId);
    try {
      await onRemoveMember(memberId);
      announce(
        t('facilityTeam.memberRemoved', '{name} was removed from the facility team.', {
          name: removed?.fullName ?? '',
        }),
      );
    } catch (error) {
      forgetRemovedRow();
      throw error;
    }
  };

  return (
    <section className={styles.card} aria-labelledby="members-heading">
      <LiveRegion message={message} />
      <div className={styles.cardHeader}>
        <div>
          <h2 id="members-heading" ref={headingRef} tabIndex={-1}>
            {t('facilityTeam.membersTitle', 'Facility members')}
          </h2>
          <p className={styles.headerSubtitle}>
            {t('facilityTeam.membersSubtitle', 'Current staff and owners with access to this facility.')}
          </p>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.dataTable}>
          <caption className="srOnly">
            Facility team members with their role and join date
          </caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Joined</th>
              {isOwner && <th scope="col" className={styles.actionCell}>Actions</th>}
            </tr>
          </thead>
          <tbody ref={listRef}>
            {members.map((m) => {
              const isLastOwner = m.role === 'owner' && ownerCount <= 1;

              return (
                <tr key={m.id} data-row-id={m.id}>
                  <th scope="row">
                    <strong>{m.fullName}</strong>
                    {m.isCurrentUser && (
                      <span className={styles.youBadge}>{t('facilityTeam.youBadge', 'You')}</span>
                    )}
                  </th>
                  <td>{m.email}</td>
                  <td>
                    <span
                      className={`${styles.memberRoleBadge} ${
                        m.role === 'owner' ? styles.badgeOwner : styles.badgeStaff
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td>
                    <time dateTime={m.joinedAt}>{formatDate(m.joinedAt, timeZone)}</time>
                  </td>
                  {isOwner && (
                    <td className={styles.actionCell}>
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedMember(m)}
                        disabled={isLastOwner}
                        title={
                          isLastOwner
                            ? 'Cannot remove the last owner of a facility'
                            : `Remove ${m.fullName}`
                        }
                        aria-label={`Remove member ${m.fullName}`}
                        style={{ fontSize: 'var(--text-xs)', padding: '0.2rem 0.6rem' }}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RemoveMemberModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onConfirm={handleRemove}
        isPending={isRemoving}
        isLastOwner={Boolean(selectedMember?.role === 'owner' && ownerCount <= 1)}
        isOwner={isOwner}
      />
    </section>
  );
}
