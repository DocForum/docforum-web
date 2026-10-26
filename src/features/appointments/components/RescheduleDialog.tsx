import { useState } from 'react';
import { Button } from '../../../components/Button';
import type { PatientAppointment } from '../../../types/models';
import { rescheduleWindow } from '../cutoff';
import { isSlotTaken, rescheduleErrorCopy } from '../errors';
import { useOpenSlots } from '../hooks/useAppointments';
import { useReschedule } from '../hooks/useReschedule';
import { formatSlotDateTime, selectableSlots } from '../slots';
import { SlotPicker } from './SlotPicker';
import styles from './RescheduleDialog.module.css';

type Step = 'pick' | 'confirm' | 'done';

interface RescheduleDialogProps {
  appointment: PatientAppointment;
  onClose: () => void;
}

/**
 * The reschedule flow: pick → confirm → result.
 *
 * Inline panel rather than a modal — this repo has no dialog primitive, and a
 * day-grouped slot list plus a before/after comparison needs the page's full
 * measure on a 390px screen. Nothing here is allowed to remove the appointment
 * it is rescheduling: a `409` drops back to the picker with the original time
 * stated in the message, and only a confirmed swap shows the result.
 */
export function RescheduleDialog({ appointment, onClose }: RescheduleDialogProps) {
  const [step, setStep] = useState<Step>('pick');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const slotsQuery = useOpenSlots(appointment.doctorProfileId);
  const reschedule = useReschedule(appointment.id);

  const slots = selectableSlots(slotsQuery.data ?? [], {
    now: new Date(),
    currentSlotId: appointment.availabilitySlotId,
  });
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;

  const errorCopy = reschedule.isError ? rescheduleErrorCopy(reschedule.error, appointment) : null;
  const slotTaken = reschedule.isError && isSlotTaken(reschedule.error);
  const originalTime = formatSlotDateTime(appointment.availabilitySlot);

  function handleSelect(slotId: string) {
    setSelectedSlotId(slotId);
    setBlockedReason(null);
    reschedule.reset(); // a fresh choice clears the previous failure
  }

  function handleConfirm() {
    if (!selectedSlotId) return;

    // Re-check the window at the moment of confirming: the panel may have been
    // open while the appointment crossed into the cutoff.
    const window = rescheduleWindow(appointment, new Date());
    if (!window.allowed) {
      setBlockedReason(window.blockedReason);
      return;
    }
    setBlockedReason(null);

    reschedule.mutate(
      { newSlotId: selectedSlotId },
      {
        onSuccess: () => setStep('done'),
        onError: (error) => {
          if (isSlotTaken(error)) {
            // That slot is gone — send them back to a picker that has just
            // been refetched, without touching the appointment on screen.
            setSelectedSlotId(null);
            setStep('pick');
          }
          // Any other failure stays on the confirm step: retry is one click.
        },
      },
    );
  }

  const updated = reschedule.data;
  const newTime = updated?.availabilitySlot ? formatSlotDateTime(updated.availabilitySlot) : null;

  return (
    <section className={styles.panel} aria-labelledby="reschedule-heading">
      <div className={styles.head}>
        <h3 id="reschedule-heading">Reschedule this appointment</h3>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close reschedule panel">
          ×
        </button>
      </div>

      {/* Only shown before a result exists: once the swap succeeds, "your
          current appointment" would be describing the time they just moved
          away from. */}
      {step !== 'done' && (
        <p className={styles.sub}>
          Same clinician, different time. Your current appointment — <strong>{originalTime}</strong> — stays booked
          until a new time is confirmed.
        </p>
      )}

      {errorCopy && (
        <p role="alert" className={slotTaken ? styles.alertWarn : styles.alert}>
          {errorCopy}
        </p>
      )}
      {blockedReason && (
        <p role="alert" className={styles.alertWarn}>
          {blockedReason}
        </p>
      )}

      {step === 'pick' && (
        <>
          <SlotPicker
            slots={slots}
            selectedSlotId={selectedSlotId}
            onSelect={handleSelect}
            isLoading={slotsQuery.isLoading}
            disabled={reschedule.isPending}
          />
          <div className={styles.actions}>
            <Button onClick={() => setStep('confirm')} disabled={!selectedSlotId}>
              Review change
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={reschedule.isPending}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {step === 'confirm' && !selectedSlot && (
        <>
          <p role="status" className={styles.state}>
            That time is no longer in the list — someone may have just taken it. Your appointment is still{' '}
            {originalTime}.
          </p>
          <div className={styles.actions}>
            <Button
              onClick={() => {
                setSelectedSlotId(null);
                reschedule.reset();
                setStep('pick');
              }}
            >
              Choose another time
            </Button>
          </div>
        </>
      )}

      {step === 'confirm' && selectedSlot && (
        <>
          <dl className={styles.compare}>
            <div>
              <dt>Current time</dt>
              <dd className={styles.from}>{originalTime}</dd>
            </div>
            <div>
              <dt>New time</dt>
              <dd className={styles.to}>{formatSlotDateTime(selectedSlot)}</dd>
            </div>
          </dl>
          <p className={styles.note}>
            Your current time is only released when the new time is confirmed — if the new time gets taken first, you
            keep the one you have.
          </p>
          <div className={styles.actions}>
            <Button onClick={handleConfirm} loading={reschedule.isPending}>
              Confirm reschedule
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStep('pick')}
              disabled={reschedule.isPending}
            >
              {errorCopy ? 'Choose a different time' : 'Back'}
            </Button>
          </div>
        </>
      )}

      {step === 'done' && (
        <>
          <p role="status" className={styles.success}>
            {newTime ? `Your appointment is now ${newTime}.` : 'Your appointment has been updated.'}
          </p>
          <p className={styles.note}>
            {newTime
              ? 'Your previous time has been released for someone else to book.'
              : 'Go back to see the new time on your appointment.'}
          </p>
          <div className={styles.actions}>
            <Button onClick={onClose}>Done</Button>
          </div>
        </>
      )}
    </section>
  );
}
