import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import styles from './CommandPalette.module.css';

export interface CommandPaletteAction {
  id: string;
  label: string;
  category: 'navigation' | 'context';
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  actions: CommandPaletteAction[];
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ actions, open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listboxRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(
    () =>
      actions.filter((a) =>
        a.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [actions, query],
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      setFocusedIndex(-1);
    }
  }, [open]);

  const highlighted = filtered[focusedIndex];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted) {
          highlighted.run();
          onClose();
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, -1));
        return;
      }
    },
    [filtered, highlighted, onClose],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setFocusedIndex(-1);
    },
    [],
  );

  const selectAction = useCallback(
    (action: CommandPaletteAction) => {
      action.run();
      onClose();
    },
    [onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="command-palette-title"
      describedBy="command-palette-hint"
      overlayClassName={styles.backdrop}
      panelClassName={styles.panel}
    >
      <h2 id="command-palette-title" className={styles.title}>
        Command palette
      </h2>
      <label htmlFor="command-palette-input" className="srOnly">
        Search commands and patients
      </label>
      <input
        id="command-palette-input"
        role="combobox"
        aria-expanded="true"
        aria-controls="command-palette-listbox"
        aria-autocomplete="list"
        aria-activedescendant={focusedIndex >= 0 ? `command-palette-option-${focusedIndex}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Search patients, open chart, sign note…"
        className={styles.input}
      />
      <ul
        ref={listboxRef}
        id="command-palette-listbox"
        role="listbox"
        aria-label="Actions"
      >
        {filtered.length === 0 ? (
          <li role="none" className={styles.empty}>
            No matching actions
          </li>
        ) : (
          filtered.map((action, index) => {
            const isFocused = index === focusedIndex;
            return (
              <li
                key={action.id}
                role="option"
                id={`command-palette-option-${index}`}
                aria-selected={isFocused}
                className={`${styles.option} ${isFocused ? styles.focused : ''}`}
                onClick={() => selectAction(action)}
                onMouseMove={() => setFocusedIndex(index)}
              >
                <span className={styles.label}>{action.label}</span>
                {action.category === 'context' && (
                  <span className={styles.kind}>context</span>
                )}
                {action.shortcut && (
                  <span className={styles.shortcut}>{action.shortcut}</span>
                )}
              </li>
            );
          })
        )}
      </ul>
      <p id="command-palette-hint" className={styles.hint}>
        ↑/↓ to navigate · Enter to run · Esc to close
      </p>
    </Dialog>
  );
}
