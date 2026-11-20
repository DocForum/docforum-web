// docforum-core returns machine-readable error codes alongside its
// `{ message }` envelope for the cases the UI has to explain itself. Keep the
// copy here so forms and acting-for screens don't drift apart.
import { ApiError } from './api-client';

export const DEPENDENT_NOT_A_MINOR = 'DEPENDENT_NOT_A_MINOR';
export const GUARDIANSHIP_INACTIVE = 'GUARDIANSHIP_INACTIVE';

export type FormField = 'fullName' | 'dateOfBirth';

export interface FormErrorInfo {
  message: string;
  /** When set, the message belongs under this field instead of the form. */
  field?: FormField;
}

export const DEPENDENT_NOT_A_MINOR_MESSAGE =
  'This date of birth is not eligible for a dependent profile. Dependents must be under the age of majority; anyone older needs their own account.';

export const GUARDIANSHIP_INACTIVE_MESSAGE =
  'You can no longer act for this person: their account has been handed over, so they now manage their own bookings and health records. Ask them to sign in and make the change from their own account.';

/** Reads the code from the body, falling back to a code sent as the message. */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;

  if (error.body && typeof error.body === 'object') {
    const body = error.body as Record<string, unknown>;
    for (const key of ['code', 'error'] as const) {
      const value = body[key];
      if (typeof value === 'string' && value) return value;
    }
  }

  const message = error.message.trim();
  return /^[A-Z][A-Z0-9_]+$/.test(message) ? message : undefined;
}

/** Maps a failed dependent create/edit to form copy, field-targeted when the
 * server points at a specific input. */
export function describeDependentError(error: unknown, fallback: string): FormErrorInfo | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (getApiErrorCode(error) === DEPENDENT_NOT_A_MINOR) {
      return { message: DEPENDENT_NOT_A_MINOR_MESSAGE, field: 'dateOfBirth' };
    }
    return { message: error.message || fallback };
  }
  return { message: fallback };
}

/** Explains a closed guardianship on profile-scoped acting-for calls. Every
 * other failure keeps docforum-core's message. */
export function describeActingForError(error: unknown, fallback: string): string | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (getApiErrorCode(error) === GUARDIANSHIP_INACTIVE) return GUARDIANSHIP_INACTIVE_MESSAGE;
    return error.message || fallback;
  }
  return fallback;
}
