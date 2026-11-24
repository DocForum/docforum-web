import { useIntl } from 'react-intl';
import { useT } from '../../../i18n/useT';
import type { DoctorSearchResult } from '../../../types/models';
import { JoinWaitlistDialog } from '../../waitlist/components/JoinWaitlistDialog';
import styles from './DoctorSearch.module.css';

interface DoctorResultCardProps {
  doctor: DoctorSearchResult;
}

/** One ICU message covers both the singular and plural English source copy. */
export function slotCountLabel(openSlotCount: number, t: ReturnType<typeof useT>): string {
  return t('search.card.slotCount', '{count, plural, one {# open slot in the next 7 days} other {# open slots in the next 7 days}}', {
    count: openSlotCount,
  });
}

export function DoctorResultCard({ doctor }: DoctorResultCardProps) {
  const t = useT();
  const intl = useIntl();

  return (
    <li className={styles.doctorCard}>
      <div className={styles.doctorHeader}>
        <h3 className={styles.doctorName}>{doctor.fullName}</h3>
        {doctor.verificationStatus === 'verified' && (
          <span className={styles.verifiedBadge}>{t('search.card.verified', 'Verified')}</span>
        )}
      </div>
      <p className={styles.doctorSpecialties}>
        {doctor.specialties.map((specialty) => specialty.name).join(' · ')}
      </p>
      <p className={styles.doctorAvailability}>
        {doctor.nextAvailableAt
          ? t('search.card.nextAvailable', 'Next available {date}', {
              date: intl.formatDate(doctor.nextAvailableAt, { weekday: 'short', day: 'numeric', month: 'short' }),
            })
          : t('search.card.noSlots', 'No open slots in the next 7 days')}
        {doctor.nextAvailableAt && doctor.openSlotCount > 0
          ? ` — ${slotCountLabel(doctor.openSlotCount, t)}`
          : ''}
      </p>
      <div className={styles.doctorActions}>
        <JoinWaitlistDialog
          doctor={{ id: doctor.id, name: doctor.fullName }}
          specialty={
            doctor.specialties[0]
              ? { id: doctor.specialties[0].id, name: doctor.specialties[0].name }
              : null
          }
          label="Join waitlist"
        />
      </div>
    </li>
  );
}
