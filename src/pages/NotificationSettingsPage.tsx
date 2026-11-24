import { NotificationSettings } from '../features/notifications/components/NotificationSettings';

export function NotificationSettingsPage() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-3xl)',
            margin: '0 0 var(--space-2)',
          }}
        >
          Notifications
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-base)' }}>
          Control which notifications reach you, on which channel, and when quiet hours
          should apply. Safety-critical notifications are always delivered.
        </p>
      </div>

      <NotificationSettings />
    </div>
  );
}
