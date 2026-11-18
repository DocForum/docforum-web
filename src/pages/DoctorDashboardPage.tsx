import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { Button } from '../components/Button';
import { CommandPalette, CommandPaletteAction } from '../components/CommandPalette';
import { ShortcutsHelp } from '../components/ShortcutsHelp';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { QueuePanel } from '../features/queue/components/QueuePanel';
import { TodayAppointments } from '../features/doctor-today/components/TodayAppointments';
import { DoctorInbox } from '../features/messaging/components/DoctorInbox';
import { UnreadBadge } from '../features/messaging/components/UnreadBadge';
import { useT } from '../i18n/useT';
import { AbnormalResultsInbox } from '../features/results/components/AbnormalResultsInbox';
import styles from './DoctorDashboardPage.module.css';

export function DoctorDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const t = useT();

  const bindings: Record<string, string> = Object.fromEntries(
    DEFAULT_SHORTCUTS.map((b) => [b.action, b.key]),
  );

  useKeyboardShortcuts({
    bindings,
    onAction: (action) => {
      switch (action) {
        case 'open-palette':
          setPaletteOpen(true);
          break;
        case 'open-help':
          setHelpOpen(true);
          break;
        default:
          break;
      }
    },
  });

  const actions: CommandPaletteAction[] = [
    {
      id: 'queue',
      label: t('doctor.action.queue', "Open today's queue"),
      category: 'navigation',
      shortcut: 'mod+1',
      run: () => {
        setPaletteOpen(false);
      },
    },
    {
      id: 'inbox',
      label: t('doctor.action.inbox', 'Open messages inbox'),
      category: 'navigation',
      shortcut: 'mod+2',
      run: () => {
        setPaletteOpen(false);
      },
    },
    {
      id: 'consultation',
      label: t('doctor.action.consultation', 'Start consultation'),
      category: 'context',
      shortcut: 'mod+3',
      run: () => {
        setPaletteOpen(false);
        navigate('/doctor/consultation/new');
      },
    },
    {
      id: 'insights',
      label: t('doctor.action.insights', 'Open practice insights'),
      category: 'navigation',
      shortcut: 'mod+4',
      run: () => {
        setPaletteOpen(false);
        navigate('/doctor/insights');
      },
    },
    {
      id: 'abnormal-results',
      label: 'Results needing review',
      category: 'navigation',
      shortcut: 'mod+5',
      run: () => {
        setPaletteOpen(false);
        // No navigation needed; we'll show the section directly
      },
    },
  ];

  return (
    <div className="container">
      <header className={styles.dashboardHeader}>
        <h1>{t('doctor.title', 'Doctor dashboard')}</h1>
        <div className={styles.dashboardHeaderRight}>
          <UnreadBadge />
          <Button variant="secondary" onClick={() => navigate('/doctor/insights')}>
            {t('doctor.insightsButton', 'Practice insights')}
          </Button>
          <Button variant="secondary" onClick={() => setHelpOpen(true)}>
            {t('doctor.shortcutsButton', 'Shortcuts (?)')}
          </Button>
          <Button onClick={() => setPaletteOpen(true)}>
            {t('doctor.paletteButton', 'Command palette (⌘K)')}
          </Button>
        </div>
      </header>

      <ErrorBoundary level="section">
        <QueuePanel />
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <TodayAppointments />
      </ErrorBoundary>

      <div className={styles.dashboardGrid}>
        <ErrorBoundary level="section">
          <section className={styles.card}>
            <h2>{t('doctor.messagesTitle', 'Messages')}</h2>
            <DoctorInbox />
          </section>
        </ErrorBoundary>
        <ErrorBoundary level="section">
          <section className={styles.card}>
            <AbnormalResultsInbox />
          </section>
        </ErrorBoundary>
      </div>

      <CommandPalette
        actions={actions}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} bindings={bindings} />

      <div className={styles.consultationPlaceholder}>
        <p>
          {user
            ? t('doctor.signedInAs', 'Signed in as {email} ({role})', {
                email: user.email,
                role: user.role,
              })
            : ''}
        </p>
      </div>
    </div>
  );
}
