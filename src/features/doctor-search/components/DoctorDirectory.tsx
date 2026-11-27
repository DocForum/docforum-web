import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { Spinner } from '../../../components/Spinner';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { dateInZone, formatClockRange, formatDayHeading } from '../../availability/calendar';
import { useDoctorOpenSlots, usePublicDoctors, useSpecialties } from '../hooks/useDoctorDirectory';
import type { AvailabilitySlot, PublicDoctor } from '../../../types/models';
import styles from './DoctorDirectory.module.css';

/**
 * Standalone specialty browsing (issue #1): a specialty filter over the real
 * public doctor list, with each doctor's next open slot read from the real
 * availability endpoint. It deliberately does not require a symptom — the
 * symptom-driven flow from issue #30 remains a separate, complementary path.
 */
export function DoctorDirectory() {
  const [specialtySlug, setSpecialtySlug] = useState('');
  const specialtiesQuery = useSpecialties();
  const doctorsQuery = usePublicDoctors(specialtySlug || undefined);

  const specialties = specialtiesQuery.data ?? [];
  const doctors = doctorsQuery.data?.items;

  return (
    <div className={styles.container}>
      <header className={styles.intro}>
        <h1 className={styles.heading}>Browse doctors by specialty</h1>
        <p className={styles.subheading}>
          Pick a specialty to see verified doctors and their next open time. You can also{' '}
          <Link to="/patient/search">search by symptom</Link> if you are not sure which specialty you need.
        </p>
      </header>

      <div className={styles.filterCard}>
        <label className={styles.filterLabel} htmlFor="specialty-filter">
          Specialty
        </label>
        <select
          id="specialty-filter"
          className={styles.select}
          value={specialtySlug}
          onChange={(event) => setSpecialtySlug(event.target.value)}
          disabled={specialtiesQuery.isPending}
        >
          <option value="">All specialties</option>
          {specialties.map((specialty) => (
            <option key={specialty.id} value={specialty.slug}>
              {specialty.name}
            </option>
          ))}
        </select>
        {specialtiesQuery.isPending && (
          <span className={styles.filterStatus} role="status">
            <Spinner size={14} /> Loading specialties…
          </span>
        )}
        {specialtiesQuery.isError && (
          <span className={styles.filterStatus}>
            Specialties could not be loaded; you can still browse every verified doctor.
          </span>
        )}
      </div>

      {doctorsQuery.isError ? (
        <InlineError
          title="We couldn't load the doctor directory"
          message="Please try again — nothing has been booked or changed."
          onRetry={() => doctorsQuery.refetch()}
        />
      ) : doctorsQuery.isPending ? (
        <div className="card">
          <Skeleton lines={5} label="Loading doctors" />
        </div>
      ) : doctors && doctors.length === 0 ? (
        <EmptyState
          title="No verified doctors in this specialty yet"
          description="Try another specialty, or search by what is bothering you to see the specialties that treat it."
          action={{ label: 'Show all specialties', onClick: () => setSpecialtySlug('') }}
        />
      ) : (
        <>
          <p className={styles.count} role="status">
            {doctors?.length ?? 0} doctor{doctors?.length === 1 ? '' : 's'}
            {specialtySlug ? ' in this specialty' : ''}.
          </p>
          <ul className={styles.list}>
            {doctors?.map((doctor) => <DoctorDirectoryCard key={doctor.id} doctor={doctor} />)}
          </ul>
        </>
      )}
    </div>
  );
}

function DoctorDirectoryCard({ doctor }: { doctor: PublicDoctor }) {
  const { timeZone } = useTimeZone();
  const slotsQuery = useDoctorOpenSlots(doctor.id);
  const next = firstOpenSlot(slotsQuery.data);

  return (
    <li className={styles.card}>
      <div className={styles.cardMain}>
        <h2 className={styles.name}>
          <Link to={`/doctors/${doctor.id}`}>{doctor.fullName}</Link>
        </h2>
        <p className={styles.specialties}>
          {doctor.specialties.map((specialty) => specialty.name).join(' · ')}
        </p>
        <p className={styles.nextSlot}>
          {slotsQuery.isPending ? (
            <>
              <Spinner size={13} /> Checking availability…
            </>
          ) : slotsQuery.isError ? (
            'Availability could not be loaded — open the profile to try again.'
          ) : next ? (
            <span className={styles.available}>
              Next available {formatDayHeading(dateInZone(next.startTime, timeZone), 'long')},{' '}
              {formatClockRange(next.startTime, next.endTime, timeZone)}
            </span>
          ) : (
            'No open times right now'
          )}
        </p>
      </div>
      <Link className={styles.profileLink} to={`/doctors/${doctor.id}`}>
        View profile & availability
      </Link>
    </li>
  );
}

const EMPTY_SLOTS: AvailabilitySlot[] = [];

function firstOpenSlot(slots: AvailabilitySlot[] | undefined): AvailabilitySlot | null {
  return (slots ?? EMPTY_SLOTS).find((slot) => slot.status === 'open') ?? null;
}
