import { useAuthStore } from '../store/auth-store';
import { WalletLinkForm } from '../features/payments/components/WalletLinkForm';

// Fulfillment queue (view assigned orders, mark fulfilled/rejected) is
// still Phase W4 — not started, see ROADMAP.md. The payout wallet link
// below is real (Phase W5, docforum-core's Phase 5.5).
export function FacilityDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Phase W4 · fulfillment queue not started</span>
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>Your fulfillment queue will live here — see ROADMAP.md Phase W4.</p>
      </div>
      <WalletLinkForm />
    </div>
  );
}
