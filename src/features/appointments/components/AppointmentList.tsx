import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { dateInZone, formatClockRange, formatDayHeading } from '../../availability/calendar';
import { useMyAppointments } from '../hooks/useAppointments';
import { useAllPublicDoctors } from '../../doctor-search/hooks/useDoctorDirectory';
import type { AppointmentStatus, PatientAppointment } from '../../../types/models';
import styles from './AppointmentList.module.css';

const STATUS_LABEL: Partial<Record<AppointmentStatus, string>> = {
  scheduled: 'Scheduled',
  checked_in: 'Checked in',
  in_progress: 'Being seen',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

function statusLabel(status: AppointmentStatus): string {
  return STATUS_LABEL[status] ?? status.replace(/_/g, ' ');
}

function slotStartMs(appointment: PatientAppointment): number {
  const value = appointment.availabilitySlot?.startTime;
  return value ? Date.parse(value) : Number.NaN;
}

function isUpcomingVisit(appointment: PatientAppointment, now: Date): boolean {
  const start = slotStartMs(appointment);
  return appointment.status === 'scheduled' && !Number.isNaN(start) && start >= now.getTime();
}

/** Upcoming visits first (soonest first), then everything else most-recent
 * first. The real endpoint orders by `createdAt`, which is not the order a
 * patient reads an appointment list in. */
export function sortAppointments(
  appointments: readonly PatientAppointment[],
  now: Date,
): PatientAppointment[] {
  const upcoming = appointments
    .filter((appointment) => isUpcomingVisit(appointment, now))
    .sort((a, b) => slotStartMs(a) - slotStartMs(b));
  const rest = appointments
    .filter((appointment) => !isUpcomingVisit(appointment, now))
    .sort((a, b) => {
      const aStart = slotStartMs(a);
      const bStart = slotStartMs(b);
      if (Number.isNaN(aStart)) return 1;
      if (Number.isNaN(bStart)) return -1;
      return bStart - aStart;
    });
  return [...upcoming, ...rest];
}

/**
 * The patient's own appointments (issue #3), read from the REAL
 * `GET /appointments/mine`. The endpoint returns `doctorProfileId` but no
 * clinician name, so names are resolved from the public directory (also a
 * real read); when a doctor is not listed the row says "Your clinician" rather
 * than inventing a name.
 */
export function AppointmentList() {
  const { timeZone } = useTimeZone();
  const appointmentsQuery = useMyAppointments();
  const doctorsQuery = useAllPublicDoctors();
  const now = useMemo(() => new Date(), []);

  const doctorNames = useMemo(() => {
    const byId = new Map<string, string>();
    for (const doctor of doctorsQuery.data ?? []) byId.set(doctor.id, doctor.fullName);
    return byId;
  }, [doctorsQuery.data]);

  if (appointmentsQuery.isError) {
    return (
      <InlineError
        title="We couldn't load your appointments"
        message="Nothing about your bookings has changed. Please try again."
        onRetry={() => appointmentsQuery.refetch()}
      />
    );
  }

  if (appointmentsQuery.isPending) {
    return <Skeleton lines={4} label="Loading your appointments" />;
  }

  const appointments = sortAppointments(appointmentsQuery.data ?? [], now);

  if (appointments.length === 0) {
    return (
      <EmptyState
        title="You have no appointments yet"
        description="When you book a visit it appears here with its time and status, ready to open on the day."
        action={{ label: 'Find a doctor', to: '/patient/doctors' }}
      />
    );
  }

  return (
    <ul className={styles.list} aria-label="Your appointments">
      {appointments.map((appointment) => {
        const slot = appointment.availabilitySlot;
        return (
          <li key={appointment.id} className={styles.item}>
            <div className={styles.main}>
              <p className={styles.doctor}>
                {doctorNames.get(appointment.doctorProfileId) ?? 'Your clinician'}
              </p>
              <p className={styles.when}>
                {slot ? (
                  <>
                    {formatDayHeading(dateInZone(slot.startTime, timeZone), 'long')},{' '}
                    {formatClockRange(slot.startTime, slot.endTime, timeZone)}
                  </>
                ) : (
                  'Time no longer held (the slot was released)'
                )}
              </p>
              <p className={styles.zone}>Times shown in {timeZone}.</p>
            </div>
            <div className={styles.meta}>
              <span className={styles.status} data-status={appointment.status}>
                {statusLabel(appointment.status)}
              </span>
              <Link className={styles.detailLink} to={`/patient/appointments/${appointment.id}`}>
                View details
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
