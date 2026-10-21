import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFollowUpRequests, useBookFollowUp } from '../hooks/useFollowUps';
import { useDoctorSlots } from '../../booking/hooks/useBooking';
import { ApiError } from '../../../services/api-client';
import type { FollowUpRequest, PatientAppointment } from '../../../types/models';
import styles from './FollowUpList.module.css';

interface FollowUpSlotPickerProps {
  requestItem: FollowUpRequest;
  onBookSuccess: (appointment: PatientAppointment) => void;
  onCancel: () => void;
}

function FollowUpSlotPicker({ requestItem, onBookSuccess, onCancel }: FollowUpSlotPickerProps) {
  const {
    data: slots = [],
    isLoading,
    isError,
  } = useDoctorSlots(
    requestItem.doctorId,
    requestItem.suggestedWindowStart,
    requestItem.suggestedWindowEnd
  );
  const bookMutation = useBookFollowUp();

  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selectedSlotId) return;
    setConflictError(null);

    try {
      const appointment = await bookMutation.mutateAsync({
        followUpRequestId: requestItem.id,
        slotId: selectedSlotId,
      });
      onBookSuccess(appointment);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(
          'That slot was just taken by another patient. Please select another slot below.'
        );
        setSelectedSlotId('');
      } else {
        setConflictError('Failed to book follow-up. Please try again.');
      }
    }
  };

  const openSlots = slots.filter((s) => s.status === 'open');

  return (
    <div className={styles.slotPicker}>
      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
        Select a slot for {requestItem.doctorName} within suggested window (
        {new Date(requestItem.suggestedWindowStart).toLocaleDateString()} -{' '}
        {new Date(requestItem.suggestedWindowEnd).toLocaleDateString()})
      </div>

      <div className={styles.carriedOverBanner}>
        ✓ Intake info carried over automatically from previous consultation.
      </div>

      {conflictError && <div className={styles.conflictAlert}>{conflictError}</div>}

      {isLoading && <p>Loading doctor slots…</p>}
      {isError && <p>Could not load slots.</p>}

      {!isLoading && openSlots.length === 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          No open slots currently available in this window.
        </p>
      )}

      <div className={styles.slotGrid}>
        {openSlots.map((slot) => {
          const start = new Date(slot.startTime);
          const isSelected = slot.id === selectedSlotId;
          return (
            <button
              key={slot.id}
              type="button"
              className={`${styles.slotButton} ${isSelected ? styles.slotButtonSelected : ''}`}
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

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          className="button primary"
          disabled={!selectedSlotId || bookMutation.isPending}
          onClick={handleConfirm}
        >
          {bookMutation.isPending ? 'Booking…' : 'Confirm Follow-up Booking'}
        </button>
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function FollowUpList() {
  const { data: followUps = [], isLoading, isError } = useFollowUpRequests();
  const [activeBookingRequestId, setActiveBookingRequestId] = useState<string | null>(null);
  const [bookedAppointments, setBookedAppointments] = useState<Record<string, PatientAppointment>>(
    {}
  );

  if (isLoading) {
    return <p>Loading follow-up requests…</p>;
  }

  if (isError) {
    return <p className={styles.empty}>Could not load follow-up requests.</p>;
  }

  const openRequests = followUps.filter((f) => f.status === 'open');
  const expiredRequests = followUps.filter((f) => f.status === 'expired');

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Doctor Follow-up Requests</h2>
      <p className={styles.subtitle}>
        When your doctor recommends a follow-up, book it here in a couple taps with your previous intake attached.
      </p>

      {/* Open Requests */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Open Follow-up Requests</h3>

        {openRequests.length === 0 ? (
          <p className={styles.empty}>You have no open follow-up requests.</p>
        ) : (
          <div className={styles.list}>
            {openRequests.map((request) => {
              const booked = bookedAppointments[request.id];

              if (booked) {
                return (
                  <div key={request.id} className={styles.successAlert}>
                    <strong>Follow-up Booked Successfully!</strong>
                    <p style={{ margin: '0.25rem 0' }}>
                      Appointment scheduled with {request.doctorName} for{' '}
                      {new Date(booked.availabilitySlot.startTime).toLocaleString()}.
                    </p>
                    <Link to={`/patient/appointments/${booked.id}`} className="button primary">
                      View Appointment
                    </Link>
                  </div>
                );
              }

              const isBookingThis = activeBookingRequestId === request.id;

              return (
                <div key={request.id} className={styles.card}>
                  <div className={styles.header}>
                    <div>
                      <div className={styles.doctorName}>{request.doctorName}</div>
                      <div className={styles.specialty}>{request.doctorSpecialty}</div>
                    </div>
                    <span className={styles.windowBadge}>
                      Suggested: {new Date(request.suggestedWindowStart).toLocaleDateString()} -{' '}
                      {new Date(request.suggestedWindowEnd).toLocaleDateString()}
                    </span>
                  </div>

                  <div className={styles.noteBox}>
                    <strong>Doctor's note:</strong> {request.note}
                  </div>

                  <div className={styles.carriedOverBanner}>
                    ✓ Intake is automatically carried over from your previous consultation — no re-entry needed.
                  </div>

                  {!isBookingThis && (
                    <div>
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => setActiveBookingRequestId(request.id)}
                      >
                        Book Follow-up
                      </button>
                    </div>
                  )}

                  {isBookingThis && (
                    <FollowUpSlotPicker
                      requestItem={request}
                      onBookSuccess={(appointment) => {
                        setBookedAppointments((prev) => ({
                          ...prev,
                          [request.id]: appointment,
                        }));
                        setActiveBookingRequestId(null);
                      }}
                      onCancel={() => setActiveBookingRequestId(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Expired Requests */}
      {expiredRequests.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Expired Follow-up Requests</h3>
          <div className={styles.list}>
            {expiredRequests.map((request) => (
              <div key={request.id} className={`${styles.card} ${styles.cardExpired}`}>
                <div className={styles.header}>
                  <div>
                    <div className={styles.doctorName}>{request.doctorName}</div>
                    <div className={styles.specialty}>{request.doctorSpecialty}</div>
                  </div>
                  <span className={styles.expiredBadge}>Expired Window</span>
                </div>

                <div className={styles.noteBox}>
                  <strong>Doctor's note:</strong> {request.note}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Window was: {new Date(request.suggestedWindowStart).toLocaleDateString()} to{' '}
                  {new Date(request.suggestedWindowEnd).toLocaleDateString()}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link to="/patient/booking" className="button secondary">
                    Rebook Consultation
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
