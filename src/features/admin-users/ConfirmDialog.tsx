import { useEffect } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="au-overlay">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="au-confirm-title"
        aria-describedby="au-confirm-message"
        className="au-dialog"
      >
        <h2 id="au-confirm-title">{title}</h2>
        <p id="au-confirm-message">{message}</p>
        <div className="au-actions">
          <button type="button" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="au-danger" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}