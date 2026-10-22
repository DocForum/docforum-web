import { useState } from 'react';
import { ApiError } from '../../../services/api-client';
import type { Appointment, IntakeForm } from '../../../types/models';
import { useAppointmentIntake, useTodayAppointments } from '../hooks/useDoctorToday';
import styles from './TodayAppointments.module.css';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: Appointment['status']) {
  return {
    scheduled: 'Scheduled',
    checked_in: 'Checked in',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No show',
  }[status];
}

function IntakeSummary({ intake }: { intake: IntakeForm }) {
  return (
    <div className={styles.intake}>
      <p className={styles.intakeMeta}>
        Submitted {new Date(intake.submittedAt).toLocaleString()}
      </p>
      <dl className={styles.fields}>
        <div>
          <dt>Chief complaint</dt>
          <dd>{intake.chiefComplaint}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{intake.symptomDuration || 'Not recorded'}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>{intake.severity == null ? 'Not recorded' : `${intake.severity} / 10`}</dd>
        </div>
        <div>
          <dt>Current medications</dt>
          <dd>{intake.currentMedications.length > 0 ? intake.currentMedications.join(', ') : 'None recorded'}</dd>
        </div>
        <div>
          <dt>Allergies</dt>
          <dd>{intake.allergies.length > 0 ? intake.allergies.join(', ') : 'None recorded'}</dd>
        </div>
      </dl>
      {intake.notes ? <p className={styles.intakeNotes}>{intake.notes}</p> : null}
    </div>
  );
}

function IntakeSection({ appointmentId }: { appointmentId: string }) {
  const intake = useAppointmentIntake(appointmentId, true);

  if (intake.isLoading) return <p className={styles.muted}>Loading intake...</p>;
  if (intake.isError) {
    if (intake.error instanceof ApiError && intake.error.status === 404) {
      return <p className={styles.muted}>No intake was submitted for this appointment.</p>;
    }
    return (
      <p className={styles.error} role="alert">
        Could not load this intake.
      </p>
    );
  }
  if (!intake.data) return <p className={styles.muted}>No intake was submitted for this appointment.</p>;
  return <IntakeSummary intake={intake.data} />;
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const [expanded, setExpanded] = useState(false);
  const intakeId = `intake-${appointment.id}`;

  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.rowButton}
        aria-expanded={expanded}
        aria-controls={intakeId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className={styles.time}>{formatTime(appointment.startsAt)}</span>
        <span className={styles.patient}>
          <strong>{appointment.patientName}</strong>
          <span className={styles.reason}>{appointment.reason || 'No reason recorded'}</span>
        </span>
        <span className={styles.status} data-status={appointment.status}>
          {statusLabel(appointment.status)}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded ? (
        <div id={intakeId} className={styles.expanded}>
          <h3 className={styles.intakeHeading}>Intake</h3>
          <IntakeSection appointmentId={appointment.id} />
        </div>
      ) : null}
    </li>
  );
}

export function TodayAppointments() {
  const appointments = useTodayAppointments();
  const sorted = [...(appointments.data ?? [])].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );

  return (
    <section className={styles.panel} aria-labelledby="today-appointments-heading">
      <header className={styles.panelHeader}>
        <h2 id="today-appointments-heading">Today's appointments</h2>
        <span className={styles.count}>{sorted.length} scheduled</span>
      </header>

      {appointments.isLoading ? <p className={styles.muted}>Loading today's appointments...</p> : null}
      {appointments.isError ? (
        <p className={styles.error} role="alert">
          Could not load today's appointments.
        </p>
      ) : null}
      {!appointments.isLoading && !appointments.isError && sorted.length === 0 ? (
        <p className={styles.muted}>No appointments are scheduled for today.</p>
      ) : null}

      {sorted.length > 0 ? (
        <ul className={styles.list}>
          {sorted.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))}
        </ul>
      ) : null}

      <p className={styles.privacy}>
        Intake is only ever fetched for appointments assigned to you, and is not shown to other
        doctors.
      </p>
    </section>
  );
}
