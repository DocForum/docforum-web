/**
 * Server-side validation error mapping (issue #102).
 *
 * Maps a docforum-core `VALIDATION_FAILED` error body onto a
 * `field -> message` record that react-hook-form can apply through
 * `form.setError(field, { message })`.
 *
 * Assumed server shape (to be reconciled against the real API contract):
 *   { details: [{ field: string, message: string }] }
 * or a bare array: [{ field: string, message: string }].
 *
 * These shapes are assumptions — record them here so they can be
 * reconciled once docforum-core's validation-error contract lands.
 */
export interface ServerFieldError {
  field: string;
  message: string;
}

export function mapServerErrors(body: unknown): Record<string, string> {
  const details = extractDetails(body);
  const errors: Record<string, string> = {};
  for (const detail of details) {
    if (detail?.field && detail?.message) {
      errors[String(detail.field)] = String(detail.message);
    }
  }
  return errors;
}

function extractDetails(body: unknown): ServerFieldError[] {
  if (Array.isArray(body)) return body as ServerFieldError[];
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.details)) return b.details as ServerFieldError[];
    if (Array.isArray(b.errors)) return b.errors as ServerFieldError[];
  }
  return [];
}
