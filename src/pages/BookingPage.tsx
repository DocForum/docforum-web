import { Link, useSearchParams } from 'react-router-dom';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { InlineError } from '../components/states/InlineError';
import { Skeleton } from '../components/states/Skeleton';
import { BookingFlow } from '../features/booking/components/BookingFlow';
import { useDoctorOpenSlots, usePublicDoctor } from '../features/doctor-search/hooks/useDoctorDirectory';

/**
 * Slot hand-off from the doctor profile (issue #13) into booking (issue #2):
 * `/patient/book?slotId=…&doctorId=…`. The slot is re-read from the real
 * availability endpoint, so a slot that disappeared between render and click
 * gets an explicit "no longer available" state instead of a form that can
 * only fail at submit.
 */
export function BookingPage() {
  const [params] = useSearchParams();
  const slotId = params.get('slotId');
  const doctorId = params.get('doctorId');

  const slotsQuery = useDoctorOpenSlots(doctorId ?? undefined);
  const doctorQuery = usePublicDoctor(doctorId ?? undefined);

  if (!slotId || !doctorId) {
    return (
      <div className="container">
        <div className="card">
          <h1>Choose a time first</h1>
          <p>This booking link is missing the doctor or slot. Pick a time from a doctor&apos;s profile.</p>
          <Link to="/patient/doctors">Browse doctors</Link>
        </div>
      </div>
    );
  }

  const slot = slotsQuery.data?.find((candidate) => candidate.id === slotId);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <ActingForBanner />

      {slotsQuery.isPending ? (
        <div className="card">
          <Skeleton lines={3} label="Loading your chosen time" />
        </div>
      ) : slotsQuery.isError ? (
        <div className="card">
          <InlineError
            title="We couldn't check that time"
            message="Availability could not be loaded, so nothing has been booked. Please try again."
            onRetry={() => slotsQuery.refetch()}
          />
        </div>
      ) : !slot ? (
        <div className="card">
          <h1>That time is no longer available</h1>
          <p>
            The slot was taken or released while you were choosing. Nothing has been booked — pick another open time
            to continue.
          </p>
          <Link to={`/doctors/${doctorId}`}>Back to {doctorQuery.data?.fullName ?? 'the doctor'}&apos;s availability</Link>
        </div>
      ) : (
        <BookingFlow slot={slot} doctorId={doctorId} doctorName={doctorQuery.data?.fullName ?? 'Your doctor'} />
      )}
    </div>
  );
}
