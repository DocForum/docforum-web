import { useAuthStore } from '../store/auth-store';

// Placeholder landing spot for a logged-in facility (lab/pharmacy) user.
// Real content (fulfillment queue, mark fulfilled, attach results) is
// Phase W4 — see ROADMAP.md.
export function FacilityDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
      <p>Your fulfillment queue will live here — see ROADMAP.md Phase W4.</p>
    </div>
  );
}
