import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import {
  DEPENDENT_NOT_A_MINOR,
  DEPENDENT_NOT_A_MINOR_MESSAGE,
  GUARDIANSHIP_INACTIVE,
  GUARDIANSHIP_INACTIVE_MESSAGE,
  describeActingForError,
  describeDependentError,
  getApiErrorCode,
} from './error-catalogue';

describe('error catalogue', () => {
  it('maps DEPENDENT_NOT_A_MINOR to the date field', () => {
    const error = new ApiError('Bad Request', 400, {
      code: DEPENDENT_NOT_A_MINOR,
      message: 'Dependent must be under the age of majority.',
    });

    expect(describeDependentError(error, 'Failed to add dependent.')).toEqual({
      message: DEPENDENT_NOT_A_MINOR_MESSAGE,
      field: 'dateOfBirth',
    });
  });

  it('explains GUARDIANSHIP_INACTIVE as the end of the handover', () => {
    const error = new ApiError('Forbidden', 403, { code: GUARDIANSHIP_INACTIVE });

    expect(describeActingForError(error, 'Failed to load this section.')).toBe(
      GUARDIANSHIP_INACTIVE_MESSAGE,
    );
    expect(GUARDIANSHIP_INACTIVE_MESSAGE).toMatch(/handed over/i);
    expect(GUARDIANSHIP_INACTIVE_MESSAGE).toMatch(/no longer act/i);
  });

  it('recognises a code sent as the message and leaves other failures alone', () => {
    expect(getApiErrorCode(new ApiError('DEPENDENT_NOT_A_MINOR', 400))).toBe(
      DEPENDENT_NOT_A_MINOR,
    );
    expect(
      describeDependentError(new ApiError('Full name is required.', 400), 'fallback'),
    ).toEqual({ message: 'Full name is required.' });
    expect(describeActingForError(new ApiError('Server error', 500), 'fallback')).toBe(
      'Server error',
    );
    expect(describeDependentError(null, 'fallback')).toBeNull();
  });
});
