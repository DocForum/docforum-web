// Pure helpers for the intake form (issue #36): field → payload conversion and
// dirty checks. Kept out of the component so both are testable directly.
import type { IntakeDraftFields, SubmitIntakeInput } from '../../types/models';

export const EMPTY_INTAKE_FIELDS: IntakeDraftFields = {
  chiefComplaint: '',
  symptomDuration: '',
  severity: '',
  currentMedications: '',
  allergies: '',
  notes: '',
};

/** Comma- or newline-separated free text → trimmed, de-duplicated list. */
export function parseList(value: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of value.split(/[,\n]/)) {
    const item = part.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

export function isDraftDirty(fields: IntakeDraftFields): boolean {
  return Object.values(fields).some((value) => value.trim().length > 0);
}

export interface IntakeValidation {
  ok: boolean;
  errors: Partial<Record<keyof IntakeDraftFields, string>>;
}

export function validateIntake(fields: IntakeDraftFields): IntakeValidation {
  const errors: IntakeValidation['errors'] = {};

  if (!fields.chiefComplaint.trim()) {
    errors.chiefComplaint = 'Tell us what’s bothering you — this is the main reason for your visit.';
  }

  if (fields.severity.trim()) {
    const severity = Number(fields.severity);
    if (!Number.isInteger(severity) || severity < 1 || severity > 10) {
      errors.severity = 'Use a whole number from 1 (mild) to 10 (severe).';
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** `null` when the form is not valid yet; the caller shows the field errors. */
export function toSubmitInput(slotId: string, fields: IntakeDraftFields): SubmitIntakeInput | null {
  const validation = validateIntake(fields);
  if (!validation.ok) return null;

  return {
    slotId,
    chiefComplaint: fields.chiefComplaint.trim(),
    symptomDuration: fields.symptomDuration.trim() || null,
    severity: fields.severity.trim() ? Number(fields.severity) : null,
    currentMedications: parseList(fields.currentMedications),
    allergies: parseList(fields.allergies),
    notes: fields.notes.trim() || null,
  };
}
