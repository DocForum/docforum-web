import { describe, expect, it } from 'vitest';
import { LAST_ADMIN_MESSAGE, errorMessage, isLastAdminError } from './errors';
import { buildUserListQuery, isValidEmail, maskEmail } from './utils';

describe('maskEmail', () => {
  it('keeps only the first character and the domain', () => {
    expect(maskEmail('jane.doe@example.com')).toBe('j***@example.com');
  });
  it('handles malformed values without leaking them', () => {
    expect(maskEmail('nonsense')).toBe('***');
  });
});

describe('isValidEmail', () => {
  it('accepts normal addresses and rejects malformed ones', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});

describe('buildUserListQuery', () => {
  it('includes only the filters that are set', () => {
    expect(buildUserListQuery({ page: 1, pageSize: 20 })).toBe('?page=1&pageSize=20');
    expect(
      buildUserListQuery({ search: 'dan', role: 'doctor', status: 'active', page: 2, pageSize: 20 }),
    ).toBe('?search=dan&role=doctor&status=active&page=2&pageSize=20');
  });
});

describe('last-admin error', () => {
  it('is recognised by code or by 409 + message', () => {
    expect(isLastAdminError({ code: 'LAST_ADMIN' })).toBe(true);
    expect(isLastAdminError({ status: 409, message: 'Cannot deactivate the last admin' })).toBe(true);
    expect(isLastAdminError({ status: 409, message: 'conflict' })).toBe(false);
    expect(isLastAdminError(new Error('boom'))).toBe(false);
  });
  it('maps to a clear message', () => {
    expect(errorMessage({ code: 'LAST_ADMIN' })).toBe(LAST_ADMIN_MESSAGE);
    expect(errorMessage(new Error('Network down'))).toBe('Network down');
    expect(errorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});