import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api-client';
import {
  describeDecisionError,
  describeDetailError,
  describeDocumentError,
  describeHistoryError,
  describeQueueError,
} from './errors';

describe('queue and detail errors', () => {
  it('names a missing queue endpoint instead of showing a generic failure', () => {
    expect(describeQueueError(new ApiError('Not found', 404))).toMatch(/doesn't serve the verification queue/);
    expect(describeDetailError(new ApiError('Not found', 404))).toMatch(/Return to the queue/);
  });

  it('tells an expired admin session what to do', () => {
    expect(describeQueueError(new ApiError('Forbidden', 403))).toMatch(/no longer has admin access/);
    expect(describeDetailError(new ApiError('Unauthorized', 401))).toMatch(/no longer has admin access/);
  });

  it('falls back to a retryable message for network and 5xx failures', () => {
    expect(describeQueueError(new TypeError('fetch failed'))).toMatch(/try again/i);
    expect(describeDetailError(new ApiError('Bad gateway', 502))).toMatch(/try again/i);
  });
});

describe('describeDecisionError', () => {
  it('treats 409/404 as another admin deciding first', () => {
    const conflict = describeDecisionError(new ApiError('Conflict', 409));
    expect(conflict.kind).toBe('conflict');
    expect(conflict.message).toMatch(/Another admin reviewed this doctor first/);
    expect(describeDecisionError(new ApiError('Gone', 404)).kind).toBe('conflict');
  });

  it('keeps 400/422 open with the server message', () => {
    const rejected = describeDecisionError(new ApiError('Reason too vague', 422));
    expect(rejected.kind).toBe('rejected');
    expect(rejected.message).toMatch(/refused the decision: Reason too vague/);
  });

  it('reports a network failure as retryable — a status flip is idempotent', () => {
    const unknown = describeDecisionError(new TypeError('fetch failed'));
    expect(unknown.kind).toBe('unknown');
    expect(unknown.message).toMatch(/Try again/);
    expect(unknown.message).not.toMatch(/cannot be undone/i);
  });
});

describe('document and history errors', () => {
  it('asks for a resubmission when a document is gone', () => {
    expect(describeDocumentError(new ApiError('Not found', 404))).toMatch(/resubmit/);
    expect(describeDocumentError(new Error('boom'))).toMatch(/fresh link/);
  });

  it('degrades the history section without failing the page', () => {
    expect(describeHistoryError(new Error('boom'))).toMatch(/Everything else on this page is still current/);
    expect(describeHistoryError(new ApiError('Forbidden', 403))).toMatch(/no longer has admin access/);
  });
});
