import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AvailabilitySlot, FollowUpRequest } from '../../../types/models';
import { ApiError } from '../../../services/api-client';
import { useBookFollowUp, useFollowUpSlots, useMyFollowUps } from '../hooks/useFollowUps';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { SlotPicker } from '../../appointments/components/SlotPicker';
import { selectableSlots } from '../../appointments/slots';
import { formatSlotDateTime } from '../../appointments/slots';
import styles from './FollowUpRequests.module.css';

function formatWindow(request: FollowUpRequest): string {
  const date = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  return `${date(request.windowStart)} – ${date(request.windowEnd)}`;
}

function slotsInWindow(slots: AvailabilitySlot[], request: FollowUpRequest): AvailabilitySlot[] {
  return selectableSlots(slots, { now: new Date() }).filter(
    (slot) =>
      slot.doctorProfileId === request.doctorProfileId &&
      Date.parse(slot.startTime) >= Date.parse(request.windowStart) &&
      Date.parse(slot.endTime) <= Date.parse(request.windowEnd),
  );
}

export function FollowUpRequests() {
  const { data, isLoading, isError, refetch } = useMyFollowUps();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookedMessage, setBookedMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const requests = data ?? [];
  const openRequests = requests.filter((request) => request.status === 'open');
  const expiredRequests = requests.filter((request) => request.status === 'expired');
  const selectedRequest = openRequests.find((request) => request.id === selectedId);
  const slotsQuery = useFollowUpSlots(
    selectedRequest?.id ?? '',
    selectedRequest?.doctorProfileId ?? '',
    Boolean(selectedRequest),
  );
  const mutation = useBookFollowUp();
  const availableSlots = useMemo(
    () => (selectedRequest ? slotsInWindow(slotsQuery.data ?? [], selectedRequest) : []),
    [selectedRequest, slotsQuery.data],
  );

  function chooseRequest(requestId: string) {
    setSelectedId((current) => (current === requestId ? null : requestId));
    setSelectedSlotId(null);
    setBookedMessage(null);
    setBookingError(null);
    mutation.reset();
  }

  async function bookSelected() {
    if (!selectedRequest || !selectedSlotId) return;
    const slot = availableSlots.find((candidate) => candidate.id === selectedSlotId);
    if (!slot) {
      setSelectedSlotId(null);
      setBookingError('That time is no longer available. Choose another time.');
      return;
    }
    try {
      await mutation.mutateAsync({
        followUpId: selectedRequest.id,
        availabilitySlotId: selectedSlotId,
      });
      setBookedMessage(`Follow-up booked for ${formatSlotDateTime(slot)}. Your previous intake is carried over.`);
      setSelectedId(null);
      setSelectedSlotId(null);
      setBookingError(null);
    } catch (error) {
      setBookingError(
        error instanceof ApiError && error.status === 409
          ? 'That time or follow-up request is no longer available. The list has been refreshed; choose another time.'
          : 'We could not confirm this booking. Please try again.',
      );
    }
  }

  return (
    <section className={styles.section} aria-labelledby="follow-up-heading">
      <h3 id="follow-up-heading">Follow-up requested by your doctor</h3>
      {bookedMessage && <p className={styles.success} role="status">{bookedMessage}</p>}
      {bookingError && <p className={styles.error} role="alert">{bookingError}</p>}
      {isLoading && <Skeleton lines={2} label="Loading follow-up requests" />}
      {isError && (
        <InlineError
          title="Follow-up requests could not be loaded"
          message="Your other care information is still available. Try loading follow-up requests again."
          onRetry={() => void refetch()}
        />
      )}
      {!isLoading && !isError && openRequests.length === 0 && expiredRequests.length === 0 && (
        <p className={styles.empty}>Follow-up requests from your doctor will appear here.</p>
      )}

      {openRequests.map((request) => (
        <article className={styles.request} key={request.id}>
          <div className={styles.requestHeading}>
            <div>
              <h4>Book a follow-up visit</h4>
              <p className={styles.window}>Suggested window: {formatWindow(request)}</p>
            </div>
            <button type="button" className={styles.action} onClick={() => chooseRequest(request.id)}>
              {selectedRequest?.id === request.id ? 'Close times' : 'Book follow-up'}
            </button>
          </div>
          {request.notesSnapshot && (
            <p className={styles.note}>
              <strong>Doctor’s note:</strong> {request.notesSnapshot}
            </p>
          )}
          {selectedRequest?.id === request.id && (
            <div className={styles.picker} aria-label="Choose a follow-up time">
              <p>Your earlier intake will be carried over. No new intake form is needed.</p>
              {slotsQuery.isError ? (
                <InlineError
                  title="Times could not be loaded"
                  message="Try again to check this doctor's availability."
                  onRetry={() => void slotsQuery.refetch()}
                />
              ) : (
                <SlotPicker
                  slots={availableSlots}
                  selectedSlotId={selectedSlotId}
                  onSelect={(slotId) => {
                    setSelectedSlotId(slotId);
                    mutation.reset();
                  }}
                  isLoading={slotsQuery.isLoading || slotsQuery.isFetching}
                  disabled={mutation.isPending}
                />
              )}
              <button
                type="button"
                className={styles.action}
                disabled={!selectedSlotId || mutation.isPending}
                onClick={() => void bookSelected()}
              >
                {mutation.isPending ? 'Booking…' : 'Confirm follow-up booking'}
              </button>
            </div>
          )}
        </article>
      ))}

      {expiredRequests.length > 0 && (
        <div className={styles.expired} aria-labelledby="expired-follow-ups">
          <h4 id="expired-follow-ups">Expired follow-ups</h4>
          {expiredRequests.map((request) => (
            <article className={styles.request} key={request.id}>
              <p className={styles.window}>Suggested window ended {formatWindow(request)}.</p>
              {request.notesSnapshot && <p className={styles.note}>{request.notesSnapshot}</p>}
              <Link to="/patient/search">Find another appointment</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
