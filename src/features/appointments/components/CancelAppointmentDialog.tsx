import { useId, useState } from 'react';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { ApiError } from '../../../services/api-client';
import type { CancellationReason, PatientAppointment } from '../../../types/models';
import {
  CANCELLATION_REASONS,
  CANCELLATION_REASON_LABEL,
  cancellationOutcome,
} from '../cancellation';
import { useCancelAppointment, useCancellationPolicy } from '../hooks/useCancellation';
import styles from './CancelAppointmentDialog.module.css';

interface CancelAppointmentDialogProps {
  appointment: PatientAppointment;
  onClose: () => void;
}

function errorCopy(error: Error | null): string | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'This appointment changed since this page loaded. Close this dialog and reopen it to see the latest details — nothing has been cancelled.';
    }
    if (error.status === 422) {
      return "This appointment can't be cancelled here under the clinic's policy. Contact the clinic if you need to change it — nothing has been cancelled.";
    }
    if (error.status === 404) {
      return 'We could not find this appointment any more. It may already have been cancelled or removed — nothing further has been changed.';
    }
  }
  return "We couldn't cancel your appointment. Nothing has been cancelled — please try again.";
}

/**
 * Policy-aware cancel flow (issue #15): reason → policy consequence →
 * confirming. The dialog reads the cutoff from the API, so the copy matches
 * what docforum-core will actually do. Cancelling stays available after the
 * cutoff; the copy just says honestly that it is late and whether the slot is
 * released.
 */
export function CancelAppointmentDialog({ appointment, onClose }: CancelAppointmentDialogProps) {
  const headingId = useId();
  const descriptionId = useId();
  const noteId = useId();
  const reasonGroupId = useId();
  const [reason, setReason] = useState<CancellationReason | null>(null);
  const [note, setNote] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const policyQuery = useCancellationPolicy(appointment.id);
  const cancel = useCancelAppointment(appointment.id);
  const now = new Date();

  const outcome = policyQuery.data
    ? cancellationOutcome(appointment, policyQuery.data, now)
    : null;
  const failure = errorCopy(cancel.error);

  function handleConfirm() {
    if (cancel.isPending || done) return;

    if (!reason) {
      setReasonError('Choose a reason so your clinician knows what happened.');
      return;
    }
    if (!outcome) return;

    setReasonError(null);
    cancel.mutate(
      {
        reason,
        note: note.trim() ? note.trim() : undefined,
        expectedUpdatedAt: appointment.updatedAt,
      },
      { onSuccess: () => setDone(true) },
    );
  }

  return (
    <Dialog open onClose={onClose} labelledBy={headingId} describedBy={descriptionId}>
      <div className={styles.panel}>
        <h2 id={headingId} className={styles.title}>
          {done ? 'Appointment cancelled' : 'Cancel this appointment?'}
        </h2>

        {done ? (
          <>
            <p id={descriptionId}>
              Your appointment is cancelled and your clinician has been told. You can book again from the doctor
              search whenever you are ready.
            </p>
            <div className={styles.actions}>
              <Button onClick={onClose} autoFocus>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <p id={descriptionId} className={styles.intro}>
              Cancelling is final. Below is what will happen to this appointment under your clinic&apos;s
              cancellation policy, based on the current time.
            </p>

            {policyQuery.isPending && (
              <p className={styles.loading} aria-busy="true">
                Checking the cancellation policy…
              </p>
            )}

            {policyQuery.isError && (
              <p className={styles.error} role="alert">
                We couldn&apos;t read this appointment&apos;s cancellation policy, so we won&apos;t cancel it
                without knowing the consequences. Please try again in a moment, or contact the clinic.
              </p>
            )}

            {outcome && !outcome.allowed && (
              <p className={styles.error} role="alert">
                {outcome.blockedReason}
              </p>
            )}

            {outcome?.allowed && (
              <>
                <div
                  className={outcome.late ? styles.warning : styles.notice}
                  data-testid="policy-outcome"
                >
                  <p>{outcome.policyStatement}</p>
                  {outcome.referralStatement && <p>{outcome.referralStatement}</p>}
                </div>

                <fieldset className={styles.fieldset} aria-describedby={reasonError ? `${reasonGroupId}-error` : undefined}>
                  <legend id={reasonGroupId} className={styles.legend}>
                    Why are you cancelling?
                  </legend>
                  {CANCELLATION_REASONS.map((option) => (
                    <label key={option.value} className={styles.radioRow}>
                      <input
                        type="radio"
                        name="cancellation-reason"
                        value={option.value}
                        checked={reason === option.value}
                        onChange={() => {
                          setReason(option.value);
                          setReasonError(null);
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                  {reasonError && (
                    <p id={`${reasonGroupId}-error`} className={styles.error} role="alert">
                      {reasonError}
                    </p>
                  )}
                </fieldset>

                <div className={styles.field}>
                  <label htmlFor={noteId} className={styles.legend}>
                    Anything else to add? (optional)
                  </label>
                  <textarea
                    id={noteId}
                    className={styles.textarea}
                    value={note}
                    maxLength={500}
                    rows={3}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Your clinician will see this."
                  />
                  <p className={styles.hint}>Please don&apos;t include clinical details here.</p>
                </div>
              </>
            )}

            {failure && (
              <p className={styles.error} role="alert">
                {failure}
              </p>
            )}

            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose} disabled={cancel.isPending}>
                Keep appointment
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirm}
                loading={cancel.isPending}
                disabled={!outcome?.allowed || !reason || policyQuery.isError}
              >
                {cancel.isPending ? 'Cancelling…' : `Yes, cancel${reason ? ` — ${CANCELLATION_REASON_LABEL[reason]}` : ''}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
