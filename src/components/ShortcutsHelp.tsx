import { DEFAULT_SHORTCUTS, bindingKey } from '../hooks/useKeyboardShortcuts';
import { Button } from './Button';
import { Dialog } from './Dialog';
import styles from './ShortcutsHelp.module.css';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  bindings: Record<string, string>;
}

export function ShortcutsHelp({ open, onClose, bindings }: ShortcutsHelpProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="shortcuts-help-title"
      describedBy="shortcuts-help-note"
      overlayClassName={styles.backdrop}
      panelClassName={styles.panel}
    >
      <h2 id="shortcuts-help-title" className={styles.title}>
        Keyboard shortcuts
      </h2>
      <p id="shortcuts-help-note" className={styles.note}>
        Shortcuts are disabled while typing in a field. Bindings can be
        adjusted to avoid clashing with assistive technology.
      </p>
      <table className={styles.table}>
        <caption className="srOnly">
          Keyboard shortcuts available in the doctor workspace
        </caption>
        <thead>
          <tr>
            <th scope="col">Action</th>
            <th scope="col">Shortcut</th>
          </tr>
        </thead>
        <tbody>
          {DEFAULT_SHORTCUTS.map((b) => (
            <tr key={b.action} className={styles.row}>
              <th scope="row">{b.label}</th>
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
    </Dialog>
  );
}
