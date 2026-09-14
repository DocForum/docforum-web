import { describe, expect, it } from 'vitest';
import { validateEmail, validateFullName, validatePassword } from './validation';

describe('validateEmail', () => {
  it('rejects empty input', () => {
    expect(validateEmail('')).toBe('Email is required.');
  });

  it('rejects a malformed address', () => {
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address.');
  });

  it('accepts a well-formed address', () => {
    expect(validateEmail('patient@example.com')).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('rejects empty input', () => {
    expect(validatePassword('')).toBe('Password is required.');
  });

  it('rejects passwords under 8 characters', () => {
    expect(validatePassword('short')).toMatch(/at least 8 characters/);
  });

  it('accepts an 8+ character password', () => {
    expect(validatePassword('longenough')).toBeUndefined();
  });
});

describe('validateFullName', () => {
  it('rejects empty/whitespace-only input', () => {
    expect(validateFullName('   ')).toBe('Full name is required.');
  });

  it('accepts a real name', () => {
    expect(validateFullName('Ada Lovelace')).toBeUndefined();
  });
});
