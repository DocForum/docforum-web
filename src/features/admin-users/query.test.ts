import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api-client';
import {
  ADMIN_USERS_PAGE_SIZE,
  isLastAdminError,
  parseAdminUserQuery,
  toAdminUserSearch,
  validateDeactivationReason,
} from './query';

describe('admin user query (#70)', () => {
  it('defaults to page 1 with no filters', () => {
    const { query, droppedInvalid } = parseAdminUserQuery(new URLSearchParams());
    expect(query).toEqual({ search: '', role: 'all', status: 'all', page: 1, pageSize: ADMIN_USERS_PAGE_SIZE });
    expect(droppedInvalid).toBe(false);
  });

  it('reads and round-trips valid filters', () => {
    const params = new URLSearchParams({ q: 'ada@example.test', role: 'admin', status: 'deactivated', page: '2' });
    const { query, droppedInvalid } = parseAdminUserQuery(params);
    expect(query).toMatchObject({ search: 'ada@example.test', role: 'admin', status: 'deactivated', page: 2 });
    expect(droppedInvalid).toBe(false);
    expect(toAdminUserSearch(query).toString()).toBe(params.toString());
  });

  it('drops invalid values rather than sending them to the API', () => {
    const { query, droppedInvalid } = parseAdminUserQuery(
      new URLSearchParams({ role: 'wizard', status: 'zombie', page: '-3' }),
    );
    expect(query.role).toBe('all');
    expect(query.status).toBe('all');
    expect(query.page).toBe(1);
    expect(droppedInvalid).toBe(true);
  });

  it('validates the deactivation reason length and collapses whitespace', () => {
    expect(validateDeactivationReason('short')).toEqual({
      error: 'Write at least 10 characters explaining why this account is being deactivated.',
    });
    expect(validateDeactivationReason('   compromised   account   ')).toEqual({ reason: 'compromised account' });
    expect(validateDeactivationReason('x'.repeat(501))).toMatchObject({ error: expect.stringMatching(/500/) });
  });

  it('recognises the last-admin conflict by code and by message', () => {
    expect(isLastAdminError(new ApiError('nope', 409, undefined, { code: 'LAST_ADMIN' }))).toBe(true);
    expect(isLastAdminError(new ApiError('cannot remove the last active admin', 409))).toBe(true);
    expect(isLastAdminError(new ApiError('conflict', 409))).toBe(false);
    expect(isLastAdminError(new ApiError('server error', 500))).toBe(false);
  });
});
