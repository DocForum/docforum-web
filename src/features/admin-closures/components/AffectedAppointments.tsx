import { useEffect } from 'react';
import type { AffectedAppointment } from '../../../types/models';

interface AffectedAppointmentsProps {
  closureId: string;
  data?: AffectedAppointment[];
}

export function AffectedAppointments({ closureId, data }: AffectedAppointmentsProps) {
  const appointments = data ?? [];

  useEffect(() => {
  }, [closureId]);

  if (!localStorage.getItem('accessToken')) {
    return null;
  }

  if (!appointments.length) {
    return <p>No appointments data available.</p>;
  }

  return (
    <div className="affected-appointments-card">
      <h2>Affected Appointments</h2>

      <p>
        {appointments.length} appointment{" "}{appointments.length !== 1 && <strong>s</strong>} affected by this closure:
      </p>

      <ul>
        {appointments.map((appointment) => (
          <li key={appointment.id} className="appointment-item">
            <strong>{appointment.patientName}</strong> ({appointment.status})
            <br />
            {appointment.startsAt && appointment.endsAt && (
              <span>
                {new Date(appointment.startsAt).toLocaleString()} -{' '}{new Date(appointment.endsAt).toLocaleString()}
              </span>
            )}
            <br />
            {appointment.reason && <small>{appointment.reason}</small>}
          </li>
        ))}
      </ul>

      {appointments.length > 0 && (
        <div className="appointment-links">
          <h3>Patient Contact Links</h3>
          <p>
            Contact patients inside the closure period so they can be rescheduled or notified.
          </p>
          {appointments.map((appointment) => (
            <div key={appointment.id} className="contact-link">
              <a
                href={`/patient/${appointment.patientProfileId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View patient profile
              </a>
              <span style={{ marginLeft: '10px', color: 'var(--color-accent)' }}>
                •
              </span>
              <a
                href={`mailto:${appointment.patientName?.toLowerCase().replace(/\s+/g, '.')}@docforum.org`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send email
              </a>
            </div>
          ))}
        </div>
      )}

      {!appointments.length && (
        <p>
          No booked appointments fall within this closure period.
        </p>
      )}
    </div>
  );
}