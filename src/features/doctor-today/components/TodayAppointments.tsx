import { useState } from 'react';
import { Button } from '../../../components/Button';
import { useAppointments } from '../../queue/hooks/useQueue';
import type { AppointmentStatus } from '../../../types/models';
import { AppointmentStatusActions, formatVisitTime } from './AppointmentStatusActions';
import styles from './TodayAppointments.module.css';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  checked_in: 'Checked in',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

/** The doctor's day: every appointment booked for today, with the two
 * actions that only apply while a visit is still scheduled. */
export function TodayAppointments() {
  const { data: appointments = [], isPending, isError, refetch } = useAppointments();
  const [conflict, setConflict] = useState<string | null>(null);

  const sorted = [...appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const scheduledCount = sorted.filter((a) => a.status === 'scheduled').length;

  return (
    <section className={styles.section} aria-labelledby="today-appointments-heading">
      <header className={styles.header}>
        <h2 id="today-appointments-heading">Today's appointments</h2>
        {scheduledCount > 0 && (
          <span className={styles.count}>
            {scheduledCount} still scheduled
          </span>
        )}
      </header>

      {conflict && (
        <p role="status" className={styles.notice}>
          {conflict}
        </p>
      )}

      {isPending && <p className={styles.empty}>Loading today's appointments…</p>}

      {isError && (
        <p role="alert" className={styles.error}>
          Couldn't load today's appointments.{' '}
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </p>
      )}

      {!isPending && !isError && sorted.length === 0 && (
        <p className={styles.empty}>No appointments are booked for today.</p>
      )}

      {sorted.length > 0 && (
        <ul className={styles.list}>
          {sorted.map((appointment) => (
            <li key={appointment.id} className={styles.row} data-status={appointment.status}>
              <div className={styles.time}>
                <span>{formatVisitTime(appointment.startsAt)}</span>
                <span className={styles.end}>to {formatVisitTime(appointment.endsAt)}</span>
              </div>

              <div className={styles.patient}>
                <strong>{appointment.patientName}</strong>
                {appointment.reason && <span className={styles.reason}>{appointment.reason}</span>}
              </div>

              <span className={styles.statusPill} data-status={appointment.status}>
                {STATUS_LABELS[appointment.status]}
              </span>

              {appointment.referral && (
                <span className={styles.referral}>{appointment.referral.targetSpecialtyName} referral</span>
              )}

              {appointment.status === 'scheduled' && (
                <div className={styles.actionsWrap}>
                  <AppointmentStatusActions appointment={appointment} onConflict={setConflict} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
