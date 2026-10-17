import { Link, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { PendingDoctorGate } from '../features/verification/components/PendingDoctorGate';
import { DoctorAvailabilityPage } from './DoctorAvailabilityPage';
import { DoctorReferralsPage } from './DoctorReferralsPage';
import { DoctorVerificationPage } from './DoctorVerificationPage';

function DoctorHome() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Phase W3 · in progress</span>
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>Manage when you can be booked, and read the referrals sent to you.</p>
        <nav style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
          <Link to="availability">My availability</Link>
          <Link to="referrals">Referrals</Link>
          <Link to="verification">Verification application</Link>
        </nav>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-6)' }}>
          Today's appointments and the consultation screen are still open work — see ROADMAP.md Phase W3
          (issues #6 and #7).
        </p>
      </div>
    </div>
  );
}

/** Appointment detail is issue #6; the referral screen (#41) already links here
 * once a patient accepts, so the destination exists rather than 404ing. */
function AppointmentPlaceholder() {
  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Phase W3 · not started</span>
        <h1>Appointment</h1>
        <p>This appointment screen is tracked as issue #6. The referral that sent you here carries its own snapshot
          of the intake and the referring doctor's notes.</p>
        <Link to="..">Back</Link>
      </div>
    </div>
  );
}

export function DoctorDashboardPage() {
  return (
    <Routes>
      <Route index element={<PendingDoctorGate><DoctorHome /></PendingDoctorGate>} />
      <Route path="verification" element={<DoctorVerificationPage />} />
      <Route
        path="availability"
        element={
          <PendingDoctorGate>
            <DoctorAvailabilityPage />
          </PendingDoctorGate>
        }
      />
      <Route
        path="referrals/*"
        element={
          <PendingDoctorGate>
            <DoctorReferralsPage />
          </PendingDoctorGate>
        }
      />
      <Route
        path="appointments/:appointmentId"
        element={
          <PendingDoctorGate>
            <AppointmentPlaceholder />
          </PendingDoctorGate>
        }
      />
    </Routes>
  );
}
