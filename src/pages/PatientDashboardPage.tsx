import { useAuthStore } from '../store/auth-store';

// Placeholder landing spot for a logged-in patient. Real content (doctor
// search, booking, appointments, referrals, orders) is Phase W2 — see
// ROADMAP.md. This page exists so Phase W1's auth flow has somewhere real
// to land, not to get ahead of the roadmap.
export function PatientDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Phase W2 · in progress</span>
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>Doctor search, booking, and your appointments will live here — see ROADMAP.md Phase W2.</p>
      </div>
    </div>
  );
}
