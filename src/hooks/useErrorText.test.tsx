import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { renderHook } from '@testing-library/react';
import { ApiError } from '../services/api-client';
import { useErrorMessage, useErrorText } from './useErrorText';

// An empty catalogue, exactly like the app before a locale chunk resolves:
// the English `defaultMessage` is what the user sees.
function wrapper({ children }: { children: ReactNode }) {
  return (
    <IntlProvider locale="en" defaultLocale="en" messages={{}} onError={() => undefined}>
      {children}
    </IntlProvider>
  );
}

function renderErrorText(error: unknown) {
  const formatError = renderHook(() => useErrorText(), { wrapper }).result.current;
  return formatError(error);
}

describe('useErrorText', () => {
  it('returns nothing when there is no error', () => {
    expect(renderErrorText(null)).toBeNull();
    expect(renderErrorText(undefined)).toBeNull();
  });

  it('maps a known backend code to its copy and recovery action', () => {
    const text = renderErrorText(
      new ApiError('slot taken', 409, undefined, { code: 'SLOT_TAKEN' }),
    );

    expect(text).toEqual({
      message: 'That time was just booked by someone else. Pick another time.',
      actionLabel: 'Pick another time',
      action: 'edit_time',
      reference: null,
    });
  });

  it('falls back to the HTTP status when the backend sends no code', () => {
    const text = renderErrorText(new ApiError('conflict', 409));

    expect(text?.message).toBe('That conflicts with the current state. Refresh, then try again.');
    expect(text?.action).toBe('retry');
    expect(text?.actionLabel).toBe('Refresh');
  });

  it('explains a network failure as a connection problem', () => {
    const text = renderErrorText(new ApiError('fetch failed', 0));

    expect(text?.message).toBe('We could not reach DocForum. Check your connection and try again.');
    expect(text?.action).toBe('retry');
  });

  it('copies an action-free error with no action label', () => {
    const text = renderErrorText(new ApiError('nope', 403));

    expect(text?.message).toBe('You do not have permission to do that.');
    expect(text?.actionLabel).toBeNull();
    expect(text?.action).toBe('none');
  });

  it('replaces an unknown code with generic copy and a support reference', () => {
    const text = renderErrorText(
      new ApiError('internal detail the user must not see', 500, undefined, {
        code: 'NOT_IN_THE_CATALOGUE',
        requestId: 'req-77',
      }),
    );

    expect(text?.message).toBe(
      'Something went wrong. Please try again, or contact support if it keeps happening.',
    );
    expect(text?.action).toBe('contact_support');
    expect(text?.actionLabel).toBe('Contact support');
    expect(text?.reference).toBe('req-77');
    // The server's own message is never rendered.
    expect(text?.message).not.toContain('internal detail');
  });

  it('keeps the reference out of the copy when the backend sent none', () => {
    const text = renderErrorText(new ApiError('mystery', 500, undefined, { code: 'MYSTERY' }));

    expect(text?.reference).toBeNull();
  });

  it('treats anything that is not an ApiError as unknown', () => {
    const text = renderErrorText(new Error('a thrown string that must not leak'));

    expect(text?.message).toBe(
      'Something went wrong. Please try again, or contact support if it keeps happening.',
    );
    expect(text?.message).not.toContain('must not leak');
    expect(text?.reference).toBeNull();
  });
});

describe('useErrorMessage', () => {
  function renderErrorMessage(error: unknown) {
    return renderHook(() => useErrorMessage(), { wrapper }).result.current(error);
  }

  it('gives forms just the message string', () => {
    expect(renderErrorMessage(new ApiError('gone', 404))).toBe(
      'We could not find that. It may have been removed or you may not have access.',
    );
  });

  it('appends the support reference for a failure the catalogue does not know', () => {
    const message = renderErrorMessage(
      // 599 has no status fallback either, so the generic copy is used.
      new ApiError('boom', 599, undefined, { requestId: 'req-12' }),
    );

    expect(message).toMatch(/\(ref: req-12\)$/);
  });

  it('carries the request id whenever the backend sent one', () => {
    const text = renderErrorText(new ApiError('conflict', 409, undefined, { requestId: 'req-9' }));

    expect(text?.message).toBe('That conflicts with the current state. Refresh, then try again.');
    expect(text?.reference).toBe('req-9');
  });

  it('returns null when there is no error', () => {
    expect(renderErrorMessage(null)).toBeNull();
  });
});
