import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { QueuePanel } from '../features/appointments/components/QueuePanel';
import { RescheduleDialog } from '../features/appointments/components/RescheduleDialog';
import { rescheduleWindow } from '../features/appointments/cutoff';
import { useAppointmentDetail, useClinician } from '../features/appointments/hooks/useAppointments';
import { formatSlotDate, formatSlotTime, isOnSlotDay } from '../features/appointments/slot';
import { formatInstant, formatSlotDateTime } from '../features/appointments/slots';
import { useSlowRequestHint } from '../hooks/useSlowRequestHint';
import { ApiError } from '../services/api-client';
import type { AppointmentStatus, PatientAppointment } from '../types/models';
import styles from './AppointmentDetailPage.module.css';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  checked_in: 'Checked in',
  in_progress: 'Being seen',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const STATUS_SENTENCE: Record<AppointmentStatus, string> = {
  scheduled: 'Confirmed — this appointment is going ahead.',
  checked_in: 'You have checked in — the visit is queued.',
  in_progress: 'Your clinician is seeing you now.',
  completed: 'This appointment has taken place.',
  cancelled: 'This appointment was cancelled.',
  no_show: 'This appointment was recorded as a no-show.',
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

/**
 * Reachable at both `/appointments/:id` (issue #14, PRD §4 — the patient's own
 * appointment management step) and the care hub's nested
 * `/patient/appointments/:appointmentId`; either param resolves the row.
 *
 * The appointment is resolved against the patient's own `GET /appointments/mine`
 * (see useAppointmentDetail), so this page has exactly three states: loading,
 * "we couldn't load it" (a failed read), and "we couldn't find that one" (an id
 * that is not theirs). It deliberately has no "you have no appointments"
 * state — nothing on this screen, including a failed reschedule, is allowed to
 * tell a patient who has an appointment that they do not.
 */
export function AppointmentDetailPage() {
  const { id, appointmentId } = useParams<{ id?: string; appointmentId?: string }>();
  const key = id ?? appointmentId;
  const detail = useAppointmentDetail(key);
  const appointment = detail.data ?? null;
  const clinician = useClinician(appointment?.doctorProfileId);
  const [showReschedule, setShowReschedule] = useState(false);
  const showColdStartHint = useSlowRequestHint(detail.isPending);
  const now = new Date();

  // Back/forward between two appointment ids reuses this mounted route
  // component. A panel opened for appointment A must never stay open on
  // appointment B — it would carry A's picked slot into B's reschedule.
  useEffect(() => {
    setShowReschedule(false);
  }, [key]);

  if (detail.isPending) {
    return (
      <div className="container">
        <div className="card" aria-busy="true">
          <p className={styles.loading}>
            <Spinner size={16} /> Loading your appointment…
          </p>
          {showColdStartHint && (
            <p className="slowHint">The server may be waking up — this can take up to a minute.</p>
          )}
        </div>
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="container">
        <div className="card" role="alert">
          <h1 className={styles.title}>We couldn&apos;t load your appointment.</h1>
          <p>
            {detail.error instanceof ApiError ? `${detail.error.message} ` : ''}
            Nothing about your appointment has changed — please try again.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => detail.refetch()}>Try again</Button>
            <Link to="/patient">All appointments</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container">
        <div className="card">
          <h1 className={styles.title}>Your appointment</h1>
          <p className={styles.loading}>We couldn&apos;t find that appointment on your account.</p>
          <p>
            It may have been cancelled, or this link points at an appointment that isn&apos;t yours. Your appointment
            list is unchanged.
          </p>
          <p className={styles.back}>
            <Link to="/patient">Back to your care summary</Link>
          </p>
        </div>
      </div>
    );
  }

  const slot = appointment.availabilitySlot;
  const window = rescheduleWindow(appointment, now);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <Link to="/patient">← All appointments</Link>
        <span className="statusPill">{STATUS_LABEL[appointment.status]}</span>
        <h1 className={styles.title}>Your appointment</h1>
      </div>

      <div className="card">
        <dl className={styles.details}>
          <div>
            <dt>Clinician</dt>
            <dd>
              {clinician.data?.fullName ?? <span className={styles.muted}>Your clinician</span>}
              {clinician.isError && (
                <small className={styles.gapNote}>
                  The clinician&apos;s name isn&apos;t available on this deployment yet.
                </small>
              )}
            </dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>
              {formatSlotDateTime(slot)}
              <p className={styles.when}>
                <strong>
                  {formatSlotDate(slot.startTime, now)} at {formatSlotTime(slot.startTime)}
                </strong>
                <br />
                <span className={styles.until}>Scheduled until {formatSlotTime(slot.endTime)}.</span>
              </p>
              <small className={styles.gapNote}>Times are shown in your local zone ({timeZone}).</small>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{STATUS_SENTENCE[appointment.status]}</dd>
          </div>
          <div>
            <dt>Booking</dt>
            <dd className={styles.detail}>
              {appointment.origin === 'referral'
                ? 'This visit came from a referral your clinician sent.'
                : 'You booked this visit yourself.'}
            </dd>
          </div>
        </dl>

        <h2 className={styles.sectionTitle}>Intake summary</h2>
        <IntakeSummary intake={appointment.intake} />

        {isClosedVisit(appointment.status) ? (
          <p className={styles.notice}>{CLOSED_COPY[appointment.status]}</p>
        ) : appointment.status === 'scheduled' && !isOnSlotDay(appointment, now) ? (
          <p className={styles.notice}>
            Check-in opens on the day of your visit ({formatSlotDate(slot.startTime, now)}).
          </p>
        ) : (
          <QueuePanel appointment={appointment} now={now} />
        )}

        <h2 className={styles.sectionTitle}>Actions</h2>
        {window.allowed ? (
          <div className={styles.actions}>
            <Button onClick={() => setShowReschedule(true)}>Reschedule</Button>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button disabled aria-describedby="reschedule-reason">
              Reschedule
            </Button>
            <p id="reschedule-reason" role="status" className={styles.reason}>
              {window.blockedReason}
            </p>
          </div>
        )}
      </div>

      {showReschedule && <RescheduleDialog appointment={appointment} onClose={() => setShowReschedule(false)} />}

      <p className={styles.back}>
        <Link to="/patient">Back to your care summary</Link>
      </p>
    </div>
  );
}

/**
 * Three genuinely different states, because they say different things:
 * `undefined` — this deployment cannot answer (intake is not modelled yet,
 * docforum-core#1/#2); `null` — it can, and the answer is "none submitted";
 * a value — render it.
 */
function IntakeSummary({ intake }: { intake: PatientAppointment['intake'] }) {
  if (intake === undefined) {
    return (
      <p className={styles.muted} data-testid="intake-unavailable">
        Intake isn&apos;t recorded for appointments on this deployment yet, so there is nothing to show here.
      </p>
    );
  }

  if (intake === null) {
    return <p className={styles.muted}>No intake was submitted for this appointment.</p>;
  }

  return (
    <div className={styles.intake}>
      <small className={styles.gapNote}>Submitted {formatInstant(intake.createdAt)}</small>
      {intake.symptoms && intake.symptoms.length > 0 && (
        <ul className={styles.symptoms}>
          {intake.symptoms.map((symptom) => (
            <li key={symptom}>{symptom}</li>
          ))}
        </ul>
      )}
      {intake.freeTextNotes && <p className={styles.notes}>{intake.freeTextNotes}</p>}
    </div>
  );
}
