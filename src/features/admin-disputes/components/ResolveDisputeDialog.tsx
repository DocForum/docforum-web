import { useId, useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useResolveDispute } from '../hooks/useDisputes';
import { describeResolveError } from '../errors';
import {
  NOTE_MAX,
  NOTE_MIN,
  normaliseNote,
  paymentConsequence,
  validateNote,
} from '../queue';
import { DisputeDialog } from './DisputeDialog';
import type {
  DisputeResolution,
  FulfillmentDisputeDetail,
} from '../../../types/models';
import styles from './Disputes.module.css';

interface ResolveDisputeDialogProps {
  dispute: FulfillmentDisputeDetail;
  resolution: DisputeResolution;
  onClose: () => void;
  onResolved: (detail: FulfillmentDisputeDetail, resolution: DisputeResolution) => void;
  onConflict: (message: string) => void;
}

const RESOLUTION_TITLES: Record<DisputeResolution, string> = {
  facility: 'Resolve for facility',
  patient: 'Resolve for patient',
};

/**
 * Final action for one side. Three deliberate safeguards before anything is
 * sent: the payment consequence is spelled out, a note is required, and the
 * admin must tick an acknowledgement that the resolution cannot be undone.
 */
export function ResolveDisputeDialog({
  dispute,
  resolution,
  onClose,
  onResolved,
  onConflict,
}: ResolveDisputeDialogProps) {
  const noteId = useId();
  const acknowledgeId = useId();
  const resolve = useResolveDispute(dispute.id);

  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const consequence = paymentConsequence(dispute, resolution);

  const handleSubmit = async () => {
    const nextNoteError = validateNote(note);
    const nextAckError = acknowledged
      ? null
      : 'Tick the box to confirm you understand this resolution is final.';
    setNoteError(nextNoteError);
    setAckError(nextAckError);
    setFailure(null);
    if (nextNoteError || nextAckError) return;

    try {
      const detail = await resolve.mutateAsync({
        resolution,
        note: normaliseNote(note),
        expectedUpdatedAt: dispute.updatedAt,
      });
      onResolved(detail, resolution);
    } catch (error) {
      const outcome = describeResolveError(error);
      if (outcome.kind === 'conflict') onConflict(outcome.message);
      else setFailure(outcome.message);
    }
  };

  return (
    <DisputeDialog
      title={RESOLUTION_TITLES[resolution]}
      description={
        <>
          <p className={styles.finalNotice}>
            <strong>This is final.</strong> A dispute can be resolved once. The payment below is made
            immediately, server-side, and cannot be reversed.
          </p>
          <div className={styles.consequence} data-resolution={resolution}>
            <span className={styles.consequenceLabel}>Payment consequence</span>
            <strong className={styles.consequenceHeadline}>{consequence.headline}</strong>
            <p>{consequence.detail}</p>
          </div>
          <p className={styles.blockedNote}>
            {resolution === 'facility'
              ? 'The patient is notified that the dispute was resolved for the facility.'
              : 'The facility is notified that the patient was refunded.'}
          </p>
        </>
      }
      busy={resolve.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={resolve.isPending}>
            Go back
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={resolve.isPending}
            disabled={!acknowledged}
          >
            {resolve.isPending
              ? 'Resolving…'
              : resolution === 'facility'
                ? 'Resolve for facility — release escrow'
                : 'Resolve for patient — refund escrow'}
          </Button>
        </>
      }
    >
      <div className={styles.field}>
        <label htmlFor={noteId} className={styles.fieldLabel}>
          Resolution note
        </label>
        <p id={`${noteId}-hint`} className={styles.fieldHint}>
          What did you check, and why does this side win? {NOTE_MIN}–{NOTE_MAX} characters. Recorded in
          the audit trail.
        </p>
        <textarea
          id={noteId}
          className={styles.textarea}
          rows={4}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (noteError) setNoteError(null);
          }}
          aria-invalid={Boolean(noteError)}
          aria-describedby={`${noteId}-hint${noteError ? ` ${noteId}-error` : ''}`}
          disabled={resolve.isPending}
        />
        {noteError && (
          <p id={`${noteId}-error`} className={styles.fieldError} role="alert">
            {noteError}
          </p>
        )}
      </div>

      <div className={styles.confirmRow}>
        <input
          id={acknowledgeId}
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => {
            setAcknowledged(event.target.checked);
            if (ackError) setAckError(null);
          }}
          disabled={resolve.isPending}
          aria-describedby={ackError ? `${acknowledgeId}-error` : undefined}
        />
        <label htmlFor={acknowledgeId} className={styles.confirmLabel}>
          I understand this is final: <strong>{consequence.headline}</strong>, and it cannot be
          undone.
        </label>
      </div>
      {ackError && (
        <p id={`${acknowledgeId}-error`} className={styles.fieldError} role="alert">
          {ackError}
        </p>
      )}

      <FormError message={failure} />
    </DisputeDialog>
  );
}
