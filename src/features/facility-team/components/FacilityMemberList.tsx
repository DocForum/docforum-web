import { useState } from 'react';
import { Button } from '../../../components/Button';
import { RemoveMemberModal } from './RemoveMemberModal';
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

  const ownerCount = members.filter((m) => m.role === 'owner').length;

  return (
    <section className={styles.card} aria-labelledby="members-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="members-heading">Facility members</h2>
          <p className={styles.headerSubtitle}>
            Current staff and owners with access to this facility.
          </p>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.dataTable} aria-label="Facility team members">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Joined</th>
              {isOwner && <th scope="col" style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isLastOwner = m.role === 'owner' && ownerCount <= 1;

              return (
                <tr key={m.id}>
                  <td>
                    <strong>{m.fullName}</strong>
                    {m.isCurrentUser && <span className={styles.youBadge}>You</span>}
                  </td>
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
                  <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
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
        onConfirm={onRemoveMember}
        isPending={isRemoving}
        isLastOwner={Boolean(selectedMember?.role === 'owner' && ownerCount <= 1)}
        isOwner={isOwner}
      />
    </section>
  );
}
