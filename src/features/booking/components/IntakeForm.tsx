import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { TextField } from '../../../components/TextField';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { useUnsavedChangesWarning } from '../../../hooks/useUnsavedChangesWarning';
import { ApiError } from '../../../services/api-client';
import type { SubmittedIntake } from '../../../types/models';
import { useIntakeDraft } from '../hooks/useIntakeDraft';
import { useSubmitIntake } from '../hooks/useSubmitIntake';
import { isDraftDirty, toSubmitInput, validateIntake } from '../intake-draft';
import styles from './IntakeForm.module.css';

interface Props {
  slotId: string;
  appointmentId: string;
  onSubmitted: (intake: SubmittedIntake) => void;
}

/**
 * Structured intake (issue #36). Answers autosave to an in-memory Zustand
 * store on every keystroke — never browser storage — so route changes and
 * failed submits don't lose them. A failed submit keeps the form exactly as
 * it was and offers retry; only success clears the draft.
 */
export function IntakeForm({ slotId, appointmentId, onSubmitted }: Props) {
  const draft = useIntakeDraft(slotId, appointmentId);
  const submitMutation = useSubmitIntake(appointmentId);
  const errorMessage = useErrorMessage();

  const [attempted, setAttempted] = useState(false);

  // The idle-timeout warning mentions this form, and leaving by link or
  // closing the tab warns while there is typed-but-unsent content.
  useUnsavedChangesWarning(draft.dirty);
  useUnsavedChangesGuard(draft.dirty && !submitMutation.isSuccess);

  const validation = attempted ? validateIntake(draft.fields) : { ok: true, errors: {} };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);

    const input = toSubmitInput(slotId, draft.fields);
    if (!input) return;

    submitMutation.mutate(input, {
      onSuccess: (intake) => {
        // Success is the only path that discards the draft.
        draft.clear();
        onSubmitted(intake);
      },
    });
  }

  const conflict =
    submitMutation.error instanceof ApiError &&
    (submitMutation.error.status === 409 || submitMutation.error.status === 404);

  const savedAt = draft.draft?.savedAt;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.autosave} role="status" aria-live="polite">
        {isDraftDirty(draft.fields) && savedAt
          ? `Draft saved in this tab at ${new Date(savedAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}. It is not stored on your device or sent until you submit.`
          : 'Your answers are kept in this tab as you type. Nothing is sent until you submit.'}
      </div>

      <TextField
        label="What’s the main reason for your visit?"
        value={draft.fields.chiefComplaint}
        onChange={(event) => draft.update({ chiefComplaint: event.target.value })}
        error={validation.errors.chiefComplaint}
        required
        autoComplete="off"
      />

      <div className={styles.row}>
        <TextField
          label="How long has this been going on?"
          hint="For example: 3 days, since last week."
          value={draft.fields.symptomDuration}
          onChange={(event) => draft.update({ symptomDuration: event.target.value })}
        />
        <TextField
          label="Severity (1–10)"
          hint="1 is mild, 10 is the worst you can imagine."
          inputMode="numeric"
          value={draft.fields.severity}
          onChange={(event) => draft.update({ severity: event.target.value })}
          error={validation.errors.severity}
        />
      </div>

      <TextField
        label="Current medications"
        hint="Separate with commas. Include doses if you know them."
        value={draft.fields.currentMedications}
        onChange={(event) => draft.update({ currentMedications: event.target.value })}
      />

      <TextField
        label="Allergies"
        hint="Medicines, food or anything else your clinician should know about."
        value={draft.fields.allergies}
        onChange={(event) => draft.update({ allergies: event.target.value })}
      />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="intake-notes">
          Anything else your clinician should know?
        </label>
        <textarea
          id="intake-notes"
          className={styles.textarea}
          rows={4}
          value={draft.fields.notes}
          onChange={(event) => draft.update({ notes: event.target.value })}
        />
      </div>

      <FormError
        message={
          conflict
            ? 'This slot expired before your intake was submitted. Your answers are still here — pick a new time and they will come with you.'
            : errorMessage(submitMutation.error)
        }
      />

      {submitMutation.error && (
        <p className={styles.kept} role="status">
          Nothing you typed was lost. Try again when you’re ready, or go back to pick a new slot.
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={submitMutation.isPending}>
          {submitMutation.error ? 'Try again' : 'Submit intake'}
        </Button>
      </div>
    </form>
  );
}
