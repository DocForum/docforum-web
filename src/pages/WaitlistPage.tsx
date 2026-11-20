import { Link } from 'react-router-dom';
import { WaitlistManager } from '../features/waitlist/components/WaitlistManager';
import { WaitlistOfferBanner } from '../features/waitlist/components/WaitlistOfferBanner';

/** `/patient/waitlist` — join, manage and accept time-boxed offers (issue #16). */
export function WaitlistPage() {
  return (
    <div className="container">
      <p>
        <Link to="/patient">← Back to your care summary</Link>
      </p>

      <WaitlistOfferBanner />

      <div className="card">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', margin: 0 }}>
          My waitlists
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          When a matching slot opens, it is held for you for a few minutes. Offers appear here and
          at the top of your care summary.
        </p>

        <WaitlistManager />

        <p style={{ marginTop: 'var(--space-5)' }}>
          <Link to="/patient/search">Find a doctor and join another waitlist</Link>
        </p>
      </div>
    </div>
  );
}
