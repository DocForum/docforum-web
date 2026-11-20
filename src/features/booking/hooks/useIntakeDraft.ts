import { useCallback } from 'react';
import { useIntakeDraftStore } from '../../../store/intake-draft-store';
import type { IntakeDraft, IntakeDraftFields } from '../../../types/models';
import { EMPTY_INTAKE_FIELDS, isDraftDirty } from '../intake-draft';

export interface IntakeDraftHandle {
  fields: IntakeDraftFields;
  /** Present only when a draft for this slot + appointment exists. */
  draft: IntakeDraft | null;
  dirty: boolean;
  update: (patch: Partial<IntakeDraftFields>) => void;
  clear: () => void;
}

/**
 * In-memory draft for one slot (issue #36). Writes happen on every keystroke;
 * the store keeps them keyed by slot so navigating away and back — or a failed
 * submit — resumes exactly where the patient left off.
 */
export function useIntakeDraft(slotId: string, appointmentId: string): IntakeDraftHandle {
  const stored = useIntakeDraftStore((state) => state.drafts[slotId]);
  const saveDraft = useIntakeDraftStore((state) => state.saveDraft);
  const clearDraft = useIntakeDraftStore((state) => state.clearDraft);

  // A draft recorded against another appointment on the same slot is not this
  // appointment's answer.
  const draft = stored && stored.appointmentId === appointmentId ? stored : null;
  const fields = draft?.fields ?? EMPTY_INTAKE_FIELDS;

  const update = useCallback(
    (patch: Partial<IntakeDraftFields>) => {
      saveDraft(slotId, {
        appointmentId,
        fields: { ...fields, ...patch },
      });
    },
    [appointmentId, fields, saveDraft, slotId],
  );

  const clear = useCallback(() => {
    clearDraft(slotId);
  }, [clearDraft, slotId]);

  return {
    fields,
    draft,
    dirty: isDraftDirty(fields),
    update,
    clear,
  };
}
