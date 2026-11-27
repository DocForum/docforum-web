import { useId, type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import styles from './Dialog.module.css';

interface ConfirmDialogProps {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  /** While a request is in flight the dialog can't be dismissed. */
  busy?: boolean;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmation dialog with a title, description and confirm/cancel actions,
 * built on the shared headless `Dialog` (focus trap, Escape, focus
 * restoration). Render it only while the confirmation is open.
 */
export function ConfirmDialog({
  title,
  description,
  children,
  busy = false,
  confirmLabel,
  cancelLabel = 'Go back',
  confirmVariant = 'primary',
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      labelledBy={titleId}
      describedBy={descriptionId}
      overlayClassName={styles.overlay}
      panelClassName={styles.dialog}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div id={descriptionId} className={styles.description}>
        {description}
      </div>
      {children ? <div className={styles.body}>{children}</div> : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          onClick={onConfirm}
          loading={busy}
          disabled={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
