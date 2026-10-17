import { useState } from 'react';
import { DEFAULT_SHORTCUTS, bindingKey } from '../hooks/useKeyboardShortcuts';
import { Button } from './Button';
import styles from './ShortcutsHelp.module.css';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  bindings: Record<string, string>;
}

export function ShortcutsHelp({ open, onClose, bindings }: ShortcutsHelpProps) {
  const [show, setShow] = useState(open);

  // Sync with the controlled open prop.
  if (open && !show) setShow(true);
  if (!open && show) setShow(false);

  if (!show) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="shortcuts-help-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="shortcuts-help-title" className={styles.title}>
          Keyboard shortcuts
        </h2>
        <p className={styles.note}>
          Shortcuts are disabled while typing in a field. Bindings can be
          adjusted to avoid clashing with assistive technology.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Action</th>
              <th>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_SHORTCUTS.map((b) => (
              <tr key={b.action} className={styles.row}>
                <td>{b.label}</td>
                <td className={styles.shortcut}>{bindingKey(b.action, bindings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.footer}>
          <Button onClick={onClose}>Close</Button>
          <p className={styles.hint}>
            Press <span className={styles.kbd}>?</span> to reopen help.
          </p>
        </div>
      </div>
    </div>
  );
}
