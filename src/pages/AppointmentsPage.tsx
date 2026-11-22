import { Link } from 'react-router-dom';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';
import { AppointmentList } from '../features/appointments/components/AppointmentList';

export function AppointmentsPage() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <ActingForBanner />
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', margin: 0 }}>My appointments</h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Every visit on your record, newest bookings first — open one to check in, reschedule or read your intake.
        </p>
      </header>
      <AppointmentList />
      <p style={{ margin: 0 }}>
        <Link to="/patient/doctors">Find another doctor</Link>
      </p>
    </div>
  );
}
