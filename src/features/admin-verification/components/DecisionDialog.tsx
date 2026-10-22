import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { useDecideVerification } from '../hooks/useVerifications';
import { describeDecisionError } from '../errors';
import {
  REASON_MAX_LENGTH,
  decisionConsequence,
  decisionLabel,
  normaliseReason,
  validateReason,
} from '../decision';
import type { DecisionStatus } from '../decision';
import type { VerificationDetail } from '../../../types/models';
import styles from './Verifications.module.css';

interface DecisionDialogProps {
  detail: VerificationDetail;
  status: DecisionStatus;
  /** Close without deciding (or after a conflict reload). */
  onClose: () => void;
  /** The decision was recorded — or someone else got there first. */
  onDecided: (outcome: { status: DecisionStatus; message?: string }) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Approve or reject with a required reason. The decision carries the
 * `updatedAt` the admin saw, so a concurrent review by another admin comes
 * back as a conflict — handled by closing and reloading instead of
 * overwriting (the parent shows the message).
 */
export function DecisionDialog({ detail, status, onClose, onDecided }: DecisionDialogProps) {
  const titleId = useId();
  const descId = useId();
  const reasonId = useId();
  const reasonErrorId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const pendingRef = useRef(false);

  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const mutation = useDecideVerification(detail.profile.id);
  const label = decisionLabel(status);
  const consequence = decisionConsequence(status);
  const reasonLength = normaliseReason(reason).length;
  const canSubmit = !mutation.isPending;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    if (!mutation.isPending) onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);

    const error = validateReason(reason);
    if (error) {
      setReasonError(error);
      return;
    }
    setReasonError(null);

    try {
      await mutation.mutateAsync({
        status,
        reason: normaliseReason(reason),
        expectedUpdatedAt: detail.profile.updatedAt,
      });
      onDecided({ status });
    } catch (cause) {
      const described = describeDecisionError(cause);
      if (described.kind === 'conflict' || described.kind === 'auth') {
        onDecided({ status, message: described.message });
        return;
      }
      setFailure(described.message);
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
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
        <h3 className={styles.dialogTitle} id={titleId}>
          {label} {detail.profile.fullName}?
        </h3>
        <p className={styles.dialogText} id={descId}>
          {consequence} Your reason is saved to the audit trail with your admin account.
        </p>

        <form className={styles.dialogBody} onSubmit={(event) => void submit(event)} noValidate>
          {failure ? (
            <div className={styles.inlineError} role="alert">
              <p>{failure}</p>
            </div>
          ) : null}

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={reasonId}>
              Reason (required)
            </label>
            <p className={styles.fieldHint} id={`${reasonId}-hint`}>
              Why this doctor is being {status === 'verified' ? 'approved' : 'rejected'} — keep clinical details out;
              this text is retained in the audit trail.
            </p>
            <textarea
              className={styles.textarea}
              id={reasonId}
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(null);
              }}
              disabled={mutation.isPending}
              maxLength={REASON_MAX_LENGTH + 100}
              aria-invalid={Boolean(reasonError)}
              aria-describedby={`${reasonId}-hint ${reasonId}-count${reasonError ? ` ${reasonErrorId}` : ''}`}
            />
            <div className={styles.fieldFooter}>
              {reasonError ? (
                <p className={styles.fieldError} id={reasonErrorId} role="alert">
                  {reasonError}
                </p>
              ) : (
                <span />
              )}
              <span className={reasonLength > REASON_MAX_LENGTH ? styles.countOver : styles.count}>
                {reasonLength}/{REASON_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className={styles.dialogActions}>
            <Button type="button" variant="secondary" onClick={close} disabled={mutation.isPending} data-initial-focus autoFocus>
              Cancel
            </Button>
            <Button type="submit" variant={status === 'verified' ? 'primary' : 'danger'} disabled={!canSubmit} loading={mutation.isPending}>
              {label}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
