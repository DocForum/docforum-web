import { Link, useParams } from 'react-router-dom';
import { FormError } from '../components/FormError';
import { QueuePanel } from '../features/appointments/components/QueuePanel';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { formatSlotDate, formatSlotTime, isOnSlotDay } from '../features/appointments/slot';
import { ApiError } from '../services/api-client';
import type { AppointmentStatus } from '../types/models';
import styles from './AppointmentDetailPage.module.css';

const STATUS_COPY: Record<AppointmentStatus, string> = {
  scheduled: 'Booked',
  checked_in: 'Checked in',
  in_progress: 'Being seen',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Marked as a no-show',
};

/** Settled visits have no queue to join, and saying why is kinder than
 * silently omitting the panel. */
const CLOSED_COPY: Record<'completed' | 'cancelled' | 'no_show', string> = {
  completed: 'This visit is already closed, so there is nothing to check in to.',
  cancelled: 'This appointment was cancelled, so there is nothing to check in to.',
  no_show: 'This appointment was recorded as a no-show, so there is nothing to check in to.',
};

/** `checked_in` and `in_progress` came from the doctor-side statuses the W3
 * flow added: a patient already in the queue must still see the live panel,
 * not a "nothing to check in to" message. */
function isClosedVisit(status: AppointmentStatus): status is 'completed' | 'cancelled' | 'no_show' {
  return status === 'completed' || status === 'cancelled' || status === 'no_show';
}

export function AppointmentDetailPage() {
  const { appointmentId } = useParams();
  const appointmentsQuery = useMyAppointments();
  const now = new Date();

  if (appointmentsQuery.isError) {
    const message =
      appointmentsQuery.error instanceof ApiError
        ? appointmentsQuery.error.message
        : 'Your appointment could not be loaded.';
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Your appointment</h1>
          <FormError message={message} />
          <p className={styles.back}>
            <Link to="/patient">Back to your care summary</Link>
          </p>
        </div>
      </div>
    );
  }

  const appointments = appointmentsQuery.data;
  if (!appointments) {
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Your appointment</h1>
          <p className={styles.loading}>{appointmentsQuery.isFetching ? 'Loading your appointment…' : 'Sign in to see your appointment.'}</p>
        </div>
      </div>
    );
  }

  const appointment = appointments.find((row) => row.id === appointmentId);
  if (!appointment) {
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Your appointment</h1>
          <p className={styles.loading}>We cannot find that appointment on your account.</p>
          <p className={styles.back}>
            <Link to="/patient">Back to your care summary</Link>
          </p>
        </div>
      </div>
    );
  }

  const slot = appointment.availabilitySlot;

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">{STATUS_COPY[appointment.status]}</span>
        <h1 className={styles.title}>Your appointment</h1>

        <p className={styles.when}>
          <strong>
            {formatSlotDate(slot.startTime, now)} at {formatSlotTime(slot.startTime)}
          </strong>
          <br />
          <span className={styles.until}>Scheduled until {formatSlotTime(slot.endTime)}.</span>
        </p>

        <p className={styles.detail}>
          {appointment.origin === 'referral'
            ? 'This visit came from a referral your clinician sent.'
            : 'You booked this visit yourself.'}
        </p>

        {isClosedVisit(appointment.status) ? (
          <p className={styles.notice}>{CLOSED_COPY[appointment.status]}</p>
        ) : appointment.status === 'scheduled' && !isOnSlotDay(appointment, now) ? (
          <p className={styles.notice}>
            Check-in opens on the day of your visit ({formatSlotDate(slot.startTime, now)}).
          </p>
        ) : (
          <QueuePanel appointment={appointment} now={now} />
        )}

        <p className={styles.back}>
          <Link to="/patient">Back to your care summary</Link>
        </p>
      </div>
    </div>
  );
}
