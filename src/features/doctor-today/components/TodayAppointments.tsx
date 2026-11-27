import { useState } from 'react';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useT, type Translate } from '../../../i18n/useT';
import { ApiError } from '../../../services/api-client';
import type { Appointment, IntakeForm } from '../../../types/models';
import { useAppointmentIntake, useTodayAppointments } from '../hooks/useDoctorToday';
import styles from './TodayAppointments.module.css';
import { formatInstant } from '../../../i18n/format';

function formatTime(iso: string) {
  return formatInstant(iso, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The queue has its own no-show wording ("No show"), deliberately different
 * from referrals ("Did not attend") and availability ("marked as a no-show"). */
function statusLabel(status: Appointment['status'], t: Translate): string {
  switch (status) {
    case 'scheduled':
      return t('doctorToday.status.scheduled', 'Scheduled');
    case 'checked_in':
      return t('doctorToday.status.checked_in', 'Checked in');
    case 'in_progress':
      return t('doctorToday.status.in_progress', 'In progress');
    case 'completed':
      return t('doctorToday.status.completed', 'Completed');
    case 'cancelled':
      return t('doctorToday.status.cancelled', 'Cancelled');
    case 'no_show':
      return t('doctorToday.status.no_show', 'No show');
  }
}

function IntakeSummary({ intake }: { intake: IntakeForm }) {
  const t = useT();
  return (
    <div className={styles.intake}>
      <p className={styles.intakeMeta}>
        {t('doctorToday.intake.submitted', 'Submitted {date}', {
          date: formatInstant(intake.submittedAt, { dateStyle: 'medium', timeStyle: 'short' }),
        })}
      </p>
      <dl className={styles.fields}>
        <div>
          <dt>{t('doctorToday.intake.chiefComplaint', 'Chief complaint')}</dt>
          <dd>{intake.chiefComplaint}</dd>
        </div>
        <div>
          <dt>{t('doctorToday.intake.duration', 'Duration')}</dt>
          <dd>{intake.symptomDuration || t('doctorToday.intake.notRecorded', 'Not recorded')}</dd>
        </div>
        <div>
          <dt>{t('doctorToday.intake.severity', 'Severity')}</dt>
          <dd>
            {intake.severity == null
              ? t('doctorToday.intake.notRecorded', 'Not recorded')
              : t('doctorToday.intake.severityValue', '{severity} / 10', { severity: intake.severity })}
          </dd>
        </div>
        <div>
          <dt>{t('doctorToday.intake.medications', 'Current medications')}</dt>
          <dd>
            {intake.currentMedications.length > 0
              ? intake.currentMedications.join(', ')
              : t('doctorToday.intake.noneRecorded', 'None recorded')}
          </dd>
        </div>
        <div>
          <dt>{t('doctorToday.intake.allergies', 'Allergies')}</dt>
          <dd>
            {intake.allergies.length > 0
              ? intake.allergies.join(', ')
              : t('doctorToday.intake.noneRecorded', 'None recorded')}
          </dd>
        </div>
      </dl>
      {intake.notes ? <p className={styles.intakeNotes}>{intake.notes}</p> : null}
    </div>
  );
}

function IntakeSection({ appointmentId }: { appointmentId: string }) {
  const t = useT();
  const intake = useAppointmentIntake(appointmentId, true);

  if (intake.isLoading) {
    return <Skeleton lines={2} label={t('doctorToday.intake.loading', 'Loading intake')} />;
  }
  if (intake.isError) {
    if (intake.error instanceof ApiError && intake.error.status === 404) {
      return <p className={styles.muted}>{t('doctorToday.intake.none', 'No intake was submitted for this appointment.')}</p>;
    }
    return (
      <InlineError
        title={t('doctorToday.intake.loadFailed', 'Could not load this intake')}
        message={queryErrorMessage(intake.error)}
        onRetry={() => void intake.refetch()}
      />
    );
  }
  if (!intake.data) {
    return <p className={styles.muted}>{t('doctorToday.intake.none', 'No intake was submitted for this appointment.')}</p>;
  }
  return <IntakeSummary intake={intake.data} />;
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const t = useT();
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
          <span className={styles.reason}>
            {appointment.reason || t('doctorToday.row.noReason', 'No reason recorded')}
          </span>
        </span>
        <span className={styles.status} data-status={appointment.status}>
          {statusLabel(appointment.status, t)}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded ? (
        <div id={intakeId} className={styles.expanded}>
          <h3 className={styles.intakeHeading}>{t('doctorToday.row.intake', 'Intake')}</h3>
          <IntakeSection appointmentId={appointment.id} />
        </div>
      ) : null}
    </li>
  );
}

export function TodayAppointments() {
  const t = useT();
  const appointments = useTodayAppointments();
  const sorted = [...(appointments.data ?? [])].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );

  return (
    <section className={styles.panel} aria-labelledby="today-appointments-heading">
      <header className={styles.panelHeader}>
        <h2 id="today-appointments-heading">{t('doctorToday.title', "Today's appointments")}</h2>
        <span className={styles.count}>
          {t('doctorToday.count', '{count, plural, one {# scheduled} other {# scheduled}}', {
            count: sorted.length,
          })}
        </span>
      </header>

      {appointments.isLoading ? (
        <Skeleton lines={4} label={t('doctorToday.loading', "Loading today's appointments")} />
      ) : null}
      {appointments.isError ? (
        <InlineError
          title={t('doctorToday.loadFailed', "Today's appointments couldn't be loaded")}
          message={queryErrorMessage(appointments.error)}
          onRetry={() => void appointments.refetch()}
        />
      ) : null}
      {!appointments.isLoading && !appointments.isError && sorted.length === 0 ? (
        <EmptyState
          title={t('doctorToday.empty', 'No appointments are scheduled for today')}
          description={t(
            'doctorToday.emptyDescription',
            "Booked visits appear here on the day, with the patient's intake form attached.",
          )}
          action={{ label: t('doctorToday.reviewMessages', 'Review your messages'), to: '/doctor/messages' }}
        />
      ) : null}

      {sorted.length > 0 ? (
        <ul className={styles.list}>
          {sorted.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))}
        </ul>
      ) : null}

      <p className={styles.privacy}>
        {t(
          'doctorToday.privacy',
          'Intake is only ever fetched for appointments assigned to you, and is not shown to other doctors.',
        )}
      </p>
    </section>
  );
}
