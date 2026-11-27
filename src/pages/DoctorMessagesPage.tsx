import { Link } from 'react-router-dom';
import { DoctorInbox } from '../features/messaging/components/DoctorInbox';
import { useT } from '../i18n/useT';

/** `/doctor/messages` — the full-page inbox, matching the other doctor pages
 * rather than rendering a bare `<h1>` inside the route table (issue #232). */
export function DoctorMessagesPage() {
  const t = useT();

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          to="/doctor"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-accent)',
            textDecoration: 'none',
          }}
        >
          {t('insights.backToDashboard', '← Back to Doctor Dashboard')}
        </Link>
      </div>
      <header style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ margin: 0 }}>{t('doctor.messagesTitle', 'Messages')}</h1>
        <p
          style={{
            margin: 'var(--space-2) 0 0',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
          }}
        >
          {t(
            'doctor.messagesSubtitle',
            'Every patient conversation, with unread counts and waiting times.',
          )}
        </p>
      </header>
      <DoctorInbox />
    </div>
  );
}
