import { ALLOWED_EVENTS } from '../utils/analytics';

/** Privacy page documenting what analytics data DocForum collects (if any),
 *  what it never collects, and how users can opt out. */
export function PrivacyPage() {
  const isEnabled = import.meta.env.VITE_ANALYTICS_ENDPOINT != null;

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: 'var(--space-4)' }}>
      <h1>Privacy &amp; analytics</h1>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>What we collect (if analytics is enabled)</h2>
        <p>
          DocForum uses cookieless, self-hostable, privacy-preserving analytics to understand
          where patients drop out of booking or which screens confuse doctors. Analytics is
          {isEnabled ? ' currently <strong>enabled</strong> on this deployment.' : ' currently <strong>disabled</strong> on this deployment.'}
        </p>
        <p>The only events we track are:</p>
        <ul style={{ listStyle: 'disc', paddingLeft: 'var(--space-4)' }}>
          {ALLOWED_EVENTS.map((event) => (
            <li key={event}>
              <code>{event}</code>
            </li>
          ))}
        </ul>
        <p>
          Each event carries only the page path (with all ids, tokens and query strings stripped)
          and a small set of non-identifying properties (such as a count or a boolean). No event
          includes your name, email, diagnosis, the specialist you searched for, or any other
          personal health information.
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>What we never collect</h2>
        <ul style={{ listStyle: 'disc', paddingLeft: 'var(--space-4)' }}>
          <li>Personal health information (PHI) of any kind</li>
          <li>Medical specialties searched or selected</li>
          <li>Search terms or free-text input</li>
          <li>User identifiers, tokens, or session IDs</li>
          <li>Query string parameters from URLs</li>
          <li>Cross-site tracking cookies</li>
        </ul>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>How URLs are scrubbed</h2>
        <p>
          Before any pageview is recorded, the URL is stripped of its query string entirely,
          and any UUID or numeric path segment is replaced with <code>:id</code>. For example,
          <code>/patient/550e8400-e29b-41d4-a716-446655440000/appointments</code> becomes
          <code>/patient/:id/appointments</code>.
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>Opting out</h2>
        <p>
          DocForum respects your browser's <strong>Do Not Track</strong> (DNT) and
          <strong> Global Privacy Control</strong> (GPC) signals. If either is enabled, no
          analytics events are sent at all. You can enable DNT in your browser settings.
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-4)' }}>
        <h2>No third-party tracking</h2>
        <p>
          DocForum does not use Google Analytics, Facebook Pixel, or any other third-party
          tracking service. The analytics endpoint is self-hosted and configured at build time
          via the <code>VITE_ANALYTICS_ENDPOINT</code> environment variable. If it is not set,
          analytics is completely disabled.
        </p>
      </section>
    </div>
  );
}
