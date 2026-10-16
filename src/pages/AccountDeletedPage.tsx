import { Link } from 'react-router-dom';

export function AccountDeletedPage() {
  return (
    <div className="container" style={{ maxWidth: '600px', margin: 'var(--space-12) auto' }}>
      <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ fontSize: '2.5rem' }} aria-hidden="true">
          ✓
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: 0 }}>
          Account deleted
        </h1>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 'var(--leading-normal)', margin: 0 }}>
          Your DocForum account has been successfully closed. Your personal identity credentials have been permanently
          scrubbed and unlinked from all medical audit logs.
        </p>
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            textAlign: 'left',
          }}
        >
          <strong>Statutory Compliance Record:</strong> As required by clinical and financial recordkeeping
          regulations, past consultation summaries, orders, and cryptographic escrow transactions remain in
          de-identified archival storage.
        </div>
        <div style={{ marginTop: 'var(--space-2)' }}>
          <Link to="/" style={{ textDecoration: 'none', fontWeight: 600, color: 'var(--color-accent)' }}>
            Return to DocForum homepage →
          </Link>
        </div>
      </div>
    </div>
  );
}
