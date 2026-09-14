import { useAuthStore } from '../store/auth-store';

// Placeholder landing spot for a logged-in doctor. Real content (today's
// appointments, intake, consultation screen) is Phase W3 — see ROADMAP.md.
export function DoctorDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Phase W3 · not started</span>
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>Today's appointments and consultations will live here — see ROADMAP.md Phase W3.</p>
      </div>
    </div>
  );
}
