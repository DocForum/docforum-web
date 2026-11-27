import { describe, expect, it } from 'vitest';
import { homePathForRole } from './role-home';

describe('homePathForRole', () => {
  it('maps every supported role to its dashboard', () => {
    expect(homePathForRole('patient')).toBe('/patient');
    expect(homePathForRole('doctor')).toBe('/doctor');
    expect(homePathForRole('facility')).toBe('/facility');
    expect(homePathForRole('admin')).toBe('/admin');
  });

  it('falls back to the public home page for an unknown or missing role', () => {
    expect(homePathForRole('auditor')).toBe('/');
    expect(homePathForRole('')).toBe('/');
    expect(homePathForRole(null)).toBe('/');
    expect(homePathForRole(undefined)).toBe('/');
  });
});
