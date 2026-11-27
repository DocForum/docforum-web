import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { TextField } from '../../../components/TextField';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { dateInZone, formatClockRange, formatDayHeading } from '../../availability/calendar';
import { useProfileStore } from '../../../store/profile-store';
import { ApiError } from '../../../services/api-client';
import { useBookAppointment, useCreateIntake } from '../hooks/useBooking';
import type {
  AvailabilitySlot,
  BookedAppointment,
  IntakeRecord,
  IntakeSeverity,
  SymptomInput,
} from '../../../types/models';
import styles from './BookingFlow.module.css';

interface Props {
  slot: AvailabilitySlot;
  doctorId: string;
  doctorName: string;
}

interface SymptomRow {
  symptom: string;
  duration: string;
  severity: IntakeSeverity | '';
}

const EMPTY_ROW: SymptomRow = { symptom: '', duration: '', severity: '' };

function toSymptoms(rows: SymptomRow[]): SymptomInput[] {
  return rows.map((row) => ({
    symptom: row.symptom.trim(),
    duration: row.duration.trim(),
    severity: row.severity as IntakeSeverity,
  }));
}

function validateRows(rows: SymptomRow[]): string | null {
  const used = rows.filter((row) => row.symptom.trim() || row.duration.trim() || row.severity);
  if (used.length === 0) return 'Add at least one symptom so your doctor knows what the visit is for.';
  for (const [index, row] of used.entries()) {
    if (!row.symptom.trim()) return `Symptom ${index + 1} needs a description.`;
    if (!row.duration.trim()) return `Symptom ${index + 1} needs how long it has been going on.`;
    if (!row.severity) return `Choose a severity for symptom ${index + 1}.`;
  }
  return null;
}

function intakeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Your intake could not be saved. Nothing has been booked — please try again.';
}

/**
 * Booking flow (issue #2). The structured intake is written first
 * (`POST /intake`, real), then the appointment (`POST /appointments`, real).
 *
 * The 409 path is deliberately its own state: docforum-core's conditional slot
 * claim is the product's double-booking guarantee, so "someone took this time
 * while you were filling the form" is explained and given a way forward — not
 * collapsed into a generic error.
 */
export function BookingFlow({ slot, doctorId, doctorName }: Props) {
  const { timeZone } = useTimeZone();
  const actingProfile = useProfileStore((state) => state.selectedProfile());
  const createIntake = useCreateIntake();
  const bookAppointment = useBookAppointment();
  const symptomHeadingId = useId();

  const [step, setStep] = useState<'intake' | 'confirm' | 'booked'>('intake');
  const [rows, setRows] = useState<SymptomRow[]>([{ ...EMPTY_ROW }]);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [intake, setIntake] = useState<IntakeRecord | null>(null);
  const [booked, setBooked] = useState<BookedAppointment | null>(null);

  const slotWhen = `${formatDayHeading(dateInZone(slot.startTime, timeZone), 'long')}, ${formatClockRange(
    slot.startTime,
    slot.endTime,
    timeZone,
  )}`;

  function updateRow(index: number, patch: Partial<SymptomRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function submitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateRows(rows);
    setValidationError(problem);
    if (problem) return;

    try {
      const created = await createIntake.mutateAsync({
        symptoms: toSymptoms(rows.filter((row) => row.symptom.trim() || row.duration.trim() || row.severity)),
        freeTextNotes: notes.trim() || undefined,
      });
      setIntake(created);
      setStep('confirm');
    } catch {
      // The mutation's error renders below; the form stays exactly as typed.
    }
  }

  async function confirmBooking() {
    try {
      const created = await bookAppointment.mutateAsync({ availabilitySlotId: slot.id });
      setBooked(created);
      setStep('booked');
    } catch {
      // Rendered below — a 409 gets its own sentence.
    }
  }

  if (step === 'booked' && booked) {
    return (
      <div className={styles.panel} role="status">
        <h1 className={styles.heading}>You&apos;re booked</h1>
        <p className={styles.lead}>
          {doctorName} · {slotWhen} ({timeZone})
        </p>
        <p className={styles.body}>
          Your intake is saved and the appointment is confirmed. You can check in from your appointments list on the
          day of the visit.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryLink} to="/patient/appointments">
            View my appointments
          </Link>
          <Link to="/patient">Back to your care summary</Link>
        </div>
      </div>
    );
  }

  const bookingConflict =
    bookAppointment.error instanceof ApiError && bookAppointment.error.status === 409;
  const bookingNotFound =
    bookAppointment.error instanceof ApiError && bookAppointment.error.status === 404;
  const bookingError = bookAppointment.error
    ? bookingConflict
      ? null
      : bookingNotFound
        ? bookAppointment.error.message
        : bookAppointment.error instanceof ApiError
          ? bookAppointment.error.message
          : 'The appointment could not be booked. Nothing has been charged or confirmed.'
    : null;

  return (
    <div className={styles.container}>
      <header className={styles.summary}>
        <p className={styles.eyebrow}>Booking</p>
        <h1 className={styles.heading}>{doctorName}</h1>
        <p className={styles.slot}>
          <strong>{slotWhen}</strong>
          <span className={styles.zone}>Times shown in your time zone ({timeZone}).</span>
        </p>
      </header>

      <ol className={styles.steps} aria-label="Booking steps">
        <li aria-current={step === 'intake' ? 'step' : undefined} className={step === 'intake' ? styles.current : styles.done}>
          1. Intake
        </li>
        <li aria-current={step === 'confirm' ? 'step' : undefined} className={step === 'confirm' ? styles.current : undefined}>
          2. Confirm
        </li>
      </ol>

      {step === 'intake' ? (
        <form className={styles.panel} onSubmit={submitIntake} noValidate>
          <h2 id={symptomHeadingId} className={styles.sectionHeading}>
            What brings you in?
          </h2>
          <p className={styles.body}>
            Your doctor needs a structured summary before the visit is confirmed. Add one row per symptom.
          </p>

          {actingProfile && !actingProfile.isSelf && (
            <p className={styles.note}>
              This appointment is being booked for <strong>{actingProfile.fullName}</strong>. Intake answers are
              recorded on your own patient profile.
            </p>
          )}

          <div className={styles.rows} aria-labelledby={symptomHeadingId}>
            {rows.map((row, index) => (
              <fieldset className={styles.rowGroup} key={index}>
                <legend className={styles.rowLegend}>Symptom {index + 1}</legend>
                <div className={styles.row}>
                  <TextField
                    label={`Symptom ${index + 1}`}
                    value={row.symptom}
                    onChange={(event) => updateRow(index, { symptom: event.target.value })}
                    required
                    autoComplete="off"
                  />
                  <TextField
                    label={`How long (symptom ${index + 1})`}
                    hint="For example: 3 days, since last week."
                    value={row.duration}
                    onChange={(event) => updateRow(index, { duration: event.target.value })}
                    required
                  />
                  <div className={styles.severity}>
                    <label className={styles.severityLabel} htmlFor={`severity-${index}`}>
                      Severity (symptom {index + 1})
                    </label>
                    <select
                      id={`severity-${index}`}
                      className={styles.select}
                      value={row.severity}
                      onChange={(event) => updateRow(index, { severity: event.target.value as IntakeSeverity | '' })}
                      required
                    >
                      <option value="">Choose…</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                </div>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove symptom {index + 1}
                  </Button>
                )}
              </fieldset>
            ))}
          </div>

          <Button type="button" variant="secondary" onClick={() => setRows((current) => [...current, { ...EMPTY_ROW }])}>
            Add another symptom
          </Button>

          <div className={styles.notes}>
            <label className={styles.notesLabel} htmlFor="intake-notes">
              Anything else your doctor should know? (optional)
            </label>
            <textarea
              id="intake-notes"
              className={styles.textarea}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <FormError message={validationError ?? (createIntake.error ? intakeErrorMessage(createIntake.error) : null)} />

          <div className={styles.actions}>
            <Button type="submit" loading={createIntake.isPending}>
              Continue to confirmation
            </Button>
            <Link to={`/doctors/${doctorId}`}>Choose another time</Link>
          </div>
        </form>
      ) : (
        <div className={styles.panel}>
          <h2 className={styles.sectionHeading}>Confirm your booking</h2>
          {intake && (
            <div className={styles.intakeSummary}>
              <p className={styles.body}>Intake saved for this booking:</p>
              <ul className={styles.intakeList}>
                {intake.symptoms.map((symptom, index) => (
                  <li key={index}>
                    <strong>{symptom.symptom}</strong> · {symptom.duration} · {symptom.severity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bookingConflict ? (
            <div className={styles.conflict} role="alert">
              <h3 className={styles.conflictHeading}>That time was just taken</h3>
              <p className={styles.body}>
                Someone else booked this slot while you were finishing your intake. Your intake is saved, but the
                appointment was not confirmed — choose another time to finish booking.
              </p>
              <Link className={styles.primaryLink} to={`/doctors/${doctorId}`}>
                Choose another time
              </Link>
            </div>
          ) : (
            <FormError message={bookingError} />
          )}

          <div className={styles.actions}>
            <Button
              onClick={confirmBooking}
              loading={bookAppointment.isPending}
              disabled={bookingConflict}
            >
              Confirm booking
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStep('intake')}
              disabled={bookAppointment.isPending}
            >
              Back to intake
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
