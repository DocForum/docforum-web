import { Link } from 'react-router-dom';
import { useMyAppointments } from '../hooks/useAppointments';
import styles from './AppointmentsList.module.css';

export function AppointmentsList() {
  const { data: appointments = [], isLoading, isError } = useMyAppointments();

  if (isLoading) {
    return <p>Loading your appointments…</p>;
  }

  if (isError) {
    return <p className={styles.empty}>Could not load appointments. Please reload to try again.</p>;
  }

  if (appointments.length === 0) {
    return (
      <div className={styles.empty}>
        <p>You have no booked appointments yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>My Appointments</h2>
      <div className={styles.list}>
        {appointments.map((appointment) => {
          const startTime = appointment.availabilitySlot?.startTime;
          const statusClass =
            appointment.status === 'completed'
              ? styles.statusCompleted
              : appointment.status === 'cancelled'
              ? styles.statusCancelled
              : styles.statusScheduled;

          return (
            <div key={appointment.id} className={styles.card}>
              <div className={styles.header}>
                <div>
                  <div className={styles.doctorName}>
                    {appointment.doctorName || 'Assigned Doctor'}
                  </div>
                  {appointment.doctorSpecialty && (
                    <div className={styles.specialty}>{appointment.doctorSpecialty}</div>
                  )}
                </div>
                <span className={`${styles.statusPill} ${statusClass}`}>
                  {appointment.status.replace('_', ' ')}
                </span>
              </div>

              {startTime && (
                <div className={styles.time}>
                  {new Date(startTime).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  at {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              <div>
                <Link to={`/patient/appointments/${appointment.id}`} className="button secondary">
                  View Visit Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
