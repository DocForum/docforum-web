import { useRef, type ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Id of the visible heading that names the dialog. Required. */
  labelledBy: string;
  /** Optional id of descriptive text. */
  describedBy?: string;
  overlayClassName?: string;
  panelClassName?: string;
  children: ReactNode;
}

/**
 * Accessible modal dialog. Use this for every modal: it provides
 * `role="dialog"`, `aria-modal`, a focus trap, Escape-to-close, focus
 * restoration, and backdrop dismissal. See
 * docs/accessibility/patterns.md#dialog.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  overlayClassName,
  panelClassName,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className={overlayClassName}
      onMouseDown={(event) => {
        // Only a press that starts on the backdrop itself closes the
        // dialog; dragging from inside must not dismiss a form.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
