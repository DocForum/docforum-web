import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { useResolveDispute } from '../hooks/useDisputes';
import { describeResolutionError } from '../errors';
import {
  NOTES_MAX_LENGTH,
  normaliseNotes,
  resolutionConsequence,
  resolutionLabel,
  resolutionTitle,
  validateNotes,
} from '../resolution';
import type { DisputeResolution, FulfillmentDispute } from '../../../types/models';
import styles from './Disputes.module.css';

interface ResolutionDialogProps {
  dispute: FulfillmentDispute;
  resolution: DisputeResolution;
  /** Close without resolving (or after an unconfirmed failure). */
  onClose: () => void;
  onResolved: (dispute: FulfillmentDispute) => void;
  /** The dispute moved under us or the session died — stop and reload. */
  onStale: (message: string) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ResolutionDialog({ dispute, resolution, onClose, onResolved, onStale }: ResolutionDialogProps) {
  const titleId = useId();
  const descId = useId();
  const notesId = useId();
  const notesErrorId = useId();
  const acknowledgeId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const pendingRef = useRef(false);

  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // A network failure may have landed server-side; retrying could double-apply
  // a final resolution, so the dialog stops offering the confirmation.
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);

  const mutation = useResolveDispute(dispute.id);
  const consequence = resolutionConsequence(dispute, resolution);
  const party = resolutionLabel(resolution);
  const notesLength = normaliseNotes(notes).length;
  // Notes are validated on submit so an admin who types too little gets an
  // explanation instead of a disabled button with no visible reason.
  const canSubmit = !mutation.isPending && !outcomeUnknown && acknowledged;
  const dialogTitle = resolutionTitle(resolution);

  onCloseRef.current = onClose;
  pendingRef.current = mutation.isPending;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayRef.current?.querySelector<HTMLButtonElement>('[data-initial-focus]')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      const dialog = overlayRef.current;
      if (!dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!pendingRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
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
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
    // Focus is set once on open; the dialog owns focus until it closes.
  }, []);

  function close() {
    if (!mutation.isPending) onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);

    const error = validateNotes(notes);
    if (error) {
      setNotesError(error);
      return;
    }
    setNotesError(null);
    if (!acknowledged || outcomeUnknown) return;

    try {
      const updated = await mutation.mutateAsync({
        resolution,
        notes: normaliseNotes(notes),
        expectedUpdatedAt: dispute.updatedAt,
      });
      onResolved(updated);
    } catch (cause) {
      const described = describeResolutionError(cause);
      if (described.kind === 'conflict' || described.kind === 'auth') {
        onStale(described.message);
        return;
      }
      setFailure(described.message);
      if (described.kind === 'unconfirmed') setOutcomeUnknown(true);
    }
  }

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <h3 className={styles.dialogTitle} id={titleId}>
          {dialogTitle}?
        </h3>
        <p className={styles.dialogText} id={descId}>
          This closes dispute <strong>#{dispute.id}</strong> for order <code>{dispute.orderId}</code> in the{' '}
          <strong>{party}'s favour</strong>. <strong>Resolutions are final — this cannot be undone or reversed.</strong>
        </p>

        <form className={styles.dialogBody} onSubmit={(event) => void submit(event)} noValidate>
          {failure && (
            <div className={styles.inlineError} role="alert">
              <p>{failure}</p>
              {outcomeUnknown && (
                <p>Close this dialog and reload the dispute before trying again, in case it was applied.</p>
              )}
            </div>
          )}

          <div className={styles.consequence}>
            <h4>Payment consequence</h4>
            <p>{consequence.payment}</p>
            <p className={styles.consequenceOutcome}>{consequence.outcome}</p>
          </div>
          <p className={styles.finalWarning}>
            {consequence.movesMoney
              ? 'Confirming moves money immediately. There is no undo.'
              : 'Confirming still closes the dispute permanently. There is no undo.'}
          </p>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={notesId}>
              Resolution notes
            </label>
            <p className={styles.fieldHint} id={`${notesId}-hint`}>
              Saved to the audit trail with your admin account. Explain the decision without clinical details.
            </p>
            <textarea
              className={styles.textarea}
              id={notesId}
              rows={3}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                if (notesError) setNotesError(null);
              }}
              disabled={mutation.isPending || outcomeUnknown}
              maxLength={NOTES_MAX_LENGTH + 100}
              aria-invalid={Boolean(notesError)}
              aria-describedby={`${notesId}-hint ${notesId}-count${notesError ? ` ${notesErrorId}` : ''}`}
            />
            <div className={styles.fieldFooter}>
              {notesError ? (
                <p className={styles.fieldError} id={notesErrorId} role="alert">
                  {notesError}
                </p>
              ) : (
                <span />
              )}
              <span className={notesLength > NOTES_MAX_LENGTH ? styles.countOver : styles.count}>
                {notesLength}/{NOTES_MAX_LENGTH}
              </span>
            </div>
          </div>

          <label className={styles.checkbox} htmlFor={acknowledgeId}>
            <input
              id={acknowledgeId}
              type="checkbox"
              checked={acknowledged}
              disabled={mutation.isPending || outcomeUnknown}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              I understand this is final and cannot be undone. Resolve the dispute in the {party}'s favour.
            </span>
          </label>

          <div className={styles.dialogActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={close}
              disabled={mutation.isPending}
              data-initial-focus
              autoFocus
            >
              {outcomeUnknown ? 'Close and reload dispute' : 'Keep dispute open'}
            </Button>
            {!outcomeUnknown && (
              <Button type="submit" disabled={!canSubmit} loading={mutation.isPending}>
                {dialogTitle}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
