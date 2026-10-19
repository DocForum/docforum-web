import { useEffect, useId, useRef } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import styles from './FeatureFlags.module.css';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]';

interface FlagDialogProps {
  title: string;
  /** Changing this (edit → review) moves focus back to the top of the dialog. */
  step: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
  actions: ReactNode;
}

/** Modal form shell: focus moves in on open and on every step change, Tab
 * wraps inside, Escape closes, and focus returns to the opener on close. */
export function FlagDialog({ title, step, onClose, onSubmit, children, actions }: FlagDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [step]);

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
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
    onSubmit();
  };

  return (
    <div className={styles.overlay}>
      <form
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        <div className={styles.dialogBody}>{children}</div>
        <div className={styles.dialogActions}>{actions}</div>
      </form>
    </div>
  );
}
