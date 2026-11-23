import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/states/EmptyState';
import { InlineError } from '../components/states/InlineError';
import { queryErrorMessage } from '../components/states/QueryState';
import { Skeleton } from '../components/states/Skeleton';
import { IntakeForm } from '../features/booking/components/IntakeForm';
import { useAppointmentDetail } from '../features/appointments/hooks/useAppointments';
import type { SubmittedIntake } from '../types/models';

function formatSlot(start: string): string {
  return new Date(start).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `/patient/appointments/:appointmentId/intake` (issue #36). */
export function IntakePage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const detail = useAppointmentDetail(appointmentId);
  const [submitted, setSubmitted] = useState<SubmittedIntake | null>(null);

  if (detail.isPending) {
    return (
      <div className="container">
        <Skeleton lines={5} label="Loading your appointment" />
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="container">
        <InlineError
          title="Your appointment couldn’t be loaded"
          message={queryErrorMessage(detail.error)}
          onRetry={() => void detail.refetch()}
        />
      </div>
    );
  }

  const appointment = detail.data;
  if (!appointment) {
    return (
      <div className="container">
        <EmptyState
          title="We couldn’t find that appointment"
          description="It may have been cancelled, or the link points at an appointment that isn’t yours."
          action={{ label: 'Back to your care summary', to: '/patient' }}
        />
      </div>
    );
  }

  const slot = appointment.availabilitySlot;
  const slotExpired =
    appointment.status === 'cancelled' ||
    appointment.status === 'no_show' ||
    Date.parse(slot.startTime) <= Date.now();

  return (
    <div className="container">
      <p>
        <Link to={`/appointments/${appointment.id}`}>← Back to your appointment</Link>
      </p>

      <div className="card">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', margin: 0 }}>
          Your intake
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          {formatSlot(slot.startTime)}. This saves your clinician time and means you won’t be asked
          the same questions at the visit.
        </p>

        {submitted ? (
          <div role="status" style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
              Intake submitted
            </h2>
            <p>Your clinician can see your answers now. You can still edit your health profile any time.</p>
            <p>
              <Link to={`/appointments/${appointment.id}`}>Back to your appointment</Link>
            </p>
          </div>
        ) : slotExpired ? (
          <div role="status" style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
              This slot is no longer available
            </h2>
            <p>
              The appointment can’t take an intake any more. Your answers are still saved in this
              tab — pick a new time and they’ll be waiting for you.
            </p>
            <p>
              <Link to={`/appointments/${appointment.id}`}>Pick a new time</Link>
              {' · '}
              <Link to="/patient/search">Find another doctor</Link>
            </p>
          </div>
        ) : appointment.intake ? (
          <div role="status" style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
              Intake already submitted
            </h2>
            <p>You’ve already sent your answers for this appointment.</p>
            <p>
              <Link to={`/appointments/${appointment.id}`}>Back to your appointment</Link>
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <IntakeForm
              slotId={slot.id}
              appointmentId={appointment.id}
              onSubmitted={setSubmitted}
            />
          </div>
        )}
      </div>
    </div>
  );
}
