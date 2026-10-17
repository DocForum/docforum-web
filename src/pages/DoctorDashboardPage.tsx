import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { Button } from '../components/Button';
import { CommandPalette, CommandPaletteAction } from '../components/CommandPalette';
import { ShortcutsHelp } from '../components/ShortcutsHelp';
import { QueuePanel } from '../features/queue/components/QueuePanel';
import { DoctorInbox } from '../features/messaging/components/DoctorInbox';
import { UnreadBadge } from '../features/messaging/components/UnreadBadge';
import styles from './DoctorDashboardPage.module.css';

export function DoctorDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
      label: "Open today's queue",
      category: 'navigation',
      shortcut: 'mod+1',
      run: () => {
        setPaletteOpen(false);
      },
    },
    {
      id: 'inbox',
      label: 'Open messages inbox',
      category: 'navigation',
      shortcut: 'mod+2',
      run: () => {
        setPaletteOpen(false);
      },
    },
    {
      id: 'consultation',
      label: 'Start consultation',
      category: 'context',
      shortcut: 'mod+3',
      run: () => {
        setPaletteOpen(false);
        navigate('/doctor/consultation/new');
      },
    },
  ];

  return (
    <div className="container">
      <header className={styles.dashboardHeader}>
        <h1>Doctor dashboard</h1>
        <div className={styles.dashboardHeaderRight}>
          <UnreadBadge />
          <Button variant="secondary" onClick={() => setHelpOpen(true)}>
            Shortcuts (?)
          </Button>
          <Button onClick={() => setPaletteOpen(true)}>
            Command palette (⌘K)
          </Button>
        </div>
      </header>

      <QueuePanel />

      <div className={styles.dashboardGrid}>
        <section className={styles.card}>
          <h2>Today\'s appointments</h2>
          <p>Appointments for today open in the live queue once the patient checks in.</p>
        </section>
        <section className={styles.card}>
          <h2>Messages</h2>
          <DoctorInbox />
        </section>
      </div>

      <CommandPalette
        actions={actions}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} bindings={bindings} />

      <div className={styles.consultationPlaceholder}>
        <p>
          {user ? `Signed in as ${user.email} (` + user.role + ')' : ''}
        </p>
      </div>
    </div>
  );
}
