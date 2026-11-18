import type { DoctorSearchResult } from '../../../types/models';
import styles from './DoctorSearch.module.css';

interface DoctorResultCardProps {
  doctor: DoctorSearchResult;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export function slotCountLabel(openSlotCount: number): string {
  return `${openSlotCount} open slot${openSlotCount === 1 ? '' : 's'} in the next 7 days`;
}

export function DoctorResultCard({ doctor }: DoctorResultCardProps) {
  return (
    <li className={styles.doctorCard}>
      <div className={styles.doctorHeader}>
        <h3 className={styles.doctorName}>{doctor.fullName}</h3>
        {doctor.verificationStatus === 'verified' && (
          <span className={styles.verifiedBadge}>Verified</span>
        )}
      </div>
      <p className={styles.doctorSpecialties}>
        {doctor.specialties.map((specialty) => specialty.name).join(' · ')}
      </p>
      <p className={styles.doctorAvailability}>
        {doctor.nextAvailableAt
          ? `Next available ${dateFormatter.format(new Date(doctor.nextAvailableAt))}`
          : 'No open slots in the next 7 days'}
        {doctor.nextAvailableAt && doctor.openSlotCount > 0
          ? ` — ${slotCountLabel(doctor.openSlotCount)}`
          : ''}
      </p>
    </li>
  );
}
