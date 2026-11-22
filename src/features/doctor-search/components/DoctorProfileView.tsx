import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { zoneShortOffset } from '../../availability/calendar';
import { useDoctorOpenSlots, usePublicDoctor } from '../hooks/useDoctorDirectory';
import { currentWeekStart } from '../week';
import { WeekAvailabilityCalendar } from './WeekAvailabilityCalendar';
import { addDays } from '../../availability/calendar';
import type { AvailabilitySlot } from '../../../types/models';
import styles from './DoctorProfileView.module.css';

interface Props {
  doctorId: string;
}

export function DoctorProfileView({ doctorId }: Props) {
  const navigate = useNavigate();
  const { timeZone } = useTimeZone();
  const doctorQuery = usePublicDoctor(doctorId);
  const slotsQuery = useDoctorOpenSlots(doctorId);
  const [weekStart, setWeekStart] = useState(() => currentWeekStart(new Date(), timeZone));

  const doctor = doctorQuery.data;

  if (doctorQuery.isPending) {
    return (
      <div className="card">
        <Skeleton lines={4} label="Loading doctor profile" />
      </div>
    );
  }

  if (doctorQuery.isError) {
    return (
      <div className="card">
        <InlineError
          title="We couldn't load this doctor"
          message="The directory may be temporarily unavailable. Nothing you have booked has changed."
          onRetry={() => doctorQuery.refetch()}
        />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="card">
        <h1 className={styles.title}>Doctor not found</h1>
        <p>
          This doctor isn&apos;t in the public directory — the profile may no longer be verified, or the link may be
          out of date.
        </p>
        <Link to="/patient/doctors">Browse doctors by specialty</Link>
      </div>
    );
  }

  const doctorZoneDiffers = Boolean(doctor.timeZone && doctor.timeZone !== timeZone);

  function selectSlot(slot: AvailabilitySlot) {
    navigate(`/patient/book?slotId=${encodeURIComponent(slot.id)}&doctorId=${encodeURIComponent(doctorId)}`);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Verified doctor{doctor.specialties.length > 0 ? ` · ${doctor.specialties.length} specialties` : ''}
          </p>
          <h1 className={styles.title}>{doctor.fullName}</h1>
          <ul className={styles.specialties} aria-label="Verified specialties">
            {doctor.specialties.map((specialty) => (
              <li key={specialty.id} className={styles.specialty}>
                {specialty.name}
              </li>
            ))}
          </ul>
        </div>
        <Link to="/patient/doctors" className={styles.back}>
          ← All doctors
        </Link>
      </header>

      {doctorZoneDiffers && doctor.timeZone && (
        <p className={styles.doctorZone}>
          {doctor.fullName}&apos;s local time: <strong>{doctor.timeZone}</strong> ({zoneShortOffset(doctor.timeZone)}).
        </p>
      )}

      {slotsQuery.isPending ? (
        <div className="card">
          <Skeleton lines={3} label="Loading availability" />
        </div>
      ) : slotsQuery.isError ? (
        <div className="card">
          <InlineError
            title="We couldn't load availability"
            message="The doctor's calendar could not be read. Nothing has been booked."
            onRetry={() => slotsQuery.refetch()}
          />
        </div>
      ) : (
        <WeekAvailabilityCalendar
          slots={slotsQuery.data ?? EMPTY_SLOTS}
          weekStart={weekStart}
          timeZone={timeZone}
          doctorName={doctor.fullName}
          onSelectSlot={selectSlot}
          onPreviousWeek={() => setWeekStart((week) => addDays(week, -7))}
          onNextWeek={() => setWeekStart((week) => addDays(week, 7))}
        />
      )}
    </div>
  );
}

/** Stable empty array: a fresh `[]` each render would re-run the calendar's
 * memoised week grouping for no reason. */
const EMPTY_SLOTS: AvailabilitySlot[] = [];
