import { useState } from 'react';
import { useDoctorSlots, useCreateBooking } from '../hooks/useBooking';
import { ApiError } from '../../../services/api-client';
import type { IntakeFormInput, PatientAppointment } from '../../../types/models';
import styles from './BookingForm.module.css';

interface BookingFormProps {
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  prefilledIntake?: Partial<IntakeFormInput>;
  onSuccess?: (appointment: PatientAppointment) => void;
}

export function BookingForm({
  doctorId,
  doctorName = 'Doctor',
  doctorSpecialty,
  prefilledIntake,
  onSuccess,
}: BookingFormProps) {
  const { data: slots = [], isLoading: isLoadingSlots, isError: isSlotsError } = useDoctorSlots(doctorId);
  const createBookingMutation = useCreateBooking();

  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState(prefilledIntake?.chiefComplaint || '');
  const [symptomDuration, setSymptomDuration] = useState(prefilledIntake?.symptomDuration || '');
  const [severity, setSeverity] = useState<number>(prefilledIntake?.severity ?? 5);
  const [currentMedicationsText, setCurrentMedicationsText] = useState(
    prefilledIntake?.currentMedications?.join(', ') || ''
  );
  const [allergiesText, setAllergiesText] = useState(prefilledIntake?.allergies?.join(', ') || '');
  const [notes, setNotes] = useState(prefilledIntake?.notes || '');

  const [conflictError, setConflictError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<PatientAppointment | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) return;

    setConflictError(null);

    const intake: IntakeFormInput = {
      chiefComplaint: chiefComplaint.trim(),
      symptomDuration: symptomDuration.trim(),
      severity,
      currentMedications: currentMedicationsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
    };

    try {
      const result = await createBookingMutation.mutateAsync({
        slotId: selectedSlotId,
        intake,
      });
      setBookedAppointment(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(
          'That time slot was just taken by another patient. Please choose another available slot below.'
        );
        setSelectedSlotId(''); // Reset slot selection so user picks another
      } else {
        setConflictError('Failed to book appointment. Please try again.');
      }
    }
  };

  if (bookedAppointment) {
    return (
      <div className={styles.successCard} role="alert">
        <h3 className={styles.successTitle}>Appointment Confirmed!</h3>
        <p>Your appointment with {doctorName} has been booked successfully.</p>
        <p>
          <strong>Time:</strong>{' '}
          {new Date(bookedAppointment.availabilitySlot.startTime).toLocaleString()}
        </p>
      </div>
    );
  }

  const openSlots = slots.filter((s) => s.status === 'open');

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <div>
        <h2 className={styles.title}>Book Consultation with {doctorName}</h2>
        {doctorSpecialty && <p className={styles.subtitle}>{doctorSpecialty}</p>}
      </div>

      {conflictError && (
        <div className={styles.conflictAlert} role="alert">
          <span className={styles.conflictTitle}>Slot unavailable</span>
          <span>{conflictError}</span>
        </div>
      )}

      <div className={styles.slotSection}>
        <label className={styles.label}>Select an Available Time Slot</label>
        {isLoadingSlots && <p className={styles.hint}>Loading available slots…</p>}
        {isSlotsError && <p className={styles.hint}>Could not load doctor slots.</p>}

        {!isLoadingSlots && openSlots.length === 0 && (
          <p className={styles.emptySlots}>No open slots currently available for this doctor.</p>
        )}

        <div className={styles.slotGrid}>
          {openSlots.map((slot) => {
            const start = new Date(slot.startTime);
            const isSelected = slot.id === selectedSlotId;
            return (
              <button
                key={slot.id}
                type="button"
                className={`${styles.slotButton} ${isSelected ? styles.selectedSlot : ''}`}
                onClick={() => {
                  setSelectedSlotId(slot.id);
                  setConflictError(null);
                }}
              >
                <div>{start.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                <div style={{ fontWeight: 600 }}>
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Structured Intake Information</h3>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="chiefComplaint">
            Primary Symptom or Reason for Visit *
          </label>
          <input
            id="chiefComplaint"
            type="text"
            required
            className={styles.input}
            placeholder="e.g. Persistent cough, Joint pain, Follow-up"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="symptomDuration">
            Symptom Duration *
          </label>
          <input
            id="symptomDuration"
            type="text"
            required
            className={styles.input}
            placeholder="e.g. 3 days, 2 weeks"
            value={symptomDuration}
            onChange={(e) => setSymptomDuration(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="severity">
            Symptom Severity (0 - 10)
          </label>
          <select
            id="severity"
            className={styles.select}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
          >
            {[...Array(11).keys()].map((n) => (
              <option key={n} value={n}>
                {n} - {n === 0 ? 'None' : n <= 3 ? 'Mild' : n <= 7 ? 'Moderate' : 'Severe'}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="currentMedications">
            Current Medications
          </label>
          <input
            id="currentMedications"
            type="text"
            className={styles.input}
            placeholder="Comma-separated (e.g. Aspirin 100mg, Metformin 500mg)"
            value={currentMedicationsText}
            onChange={(e) => setCurrentMedicationsText(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="allergies">
            Allergies
          </label>
          <input
            id="allergies"
            type="text"
            className={styles.input}
            placeholder="Comma-separated (e.g. Penicillin, Peanuts)"
            value={allergiesText}
            onChange={(e) => setAllergiesText(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="notes">
            Additional Notes for the Doctor
          </label>
          <textarea
            id="notes"
            className={styles.textarea}
            placeholder="Any additional context or questions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        className="button primary"
        disabled={!selectedSlotId || createBookingMutation.isPending}
      >
        {createBookingMutation.isPending ? 'Confirming Booking…' : 'Confirm & Book Appointment'}
      </button>
    </form>
  );
}
