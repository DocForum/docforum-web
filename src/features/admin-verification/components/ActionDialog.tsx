import { useEffect, useId, useRef } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import styles from './SpecialtyClaims.module.css';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]';

interface ActionDialogProps {
  title: string;
  description: ReactNode;
  /** While a request is in flight the dialog can't be dismissed. */
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
  actions: ReactNode;
}

/** Modal form shell: focus moves in on open, stays inside while open
 * (Tab wraps), and returns to whatever opened it on close. */
export function ActionDialog({ title, description, busy, onClose, onSubmit, children, actions }: ActionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) onSubmit();
  };

  return (
    <div className={styles.overlay}>
      <form
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        <div id={descriptionId} className={styles.dialogDescription}>
          {description}
        </div>
        <div className={styles.dialogBody}>{children}</div>
        <div className={styles.dialogActions}>{actions}</div>
      </form>
    </div>
  );
}
