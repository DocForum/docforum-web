import { describe, expect, it } from 'vitest';
import {
  ROLE_HOME,
  isPathAllowedForRole,
  rememberReturnPath,
  safeReturnPath,
  takeReturnPath,
} from './return-path';

describe('safeReturnPath (#226)', () => {
  it('keeps a deep link the signed-in role can open', () => {
    expect(safeReturnPath('/patient/orders/abc?tab=items#latest', 'patient')).toBe(
      '/patient/orders/abc?tab=items#latest',
    );
  });

  it('allows the routes a role shares with another role', () => {
    expect(safeReturnPath('/care/threads/t-1', 'doctor')).toBe('/care/threads/t-1');
    expect(safeReturnPath('/notifications', 'facility')).toBe('/notifications');
  });

  it('falls back to the role home for another role’s area', () => {
    expect(safeReturnPath('/patient/orders/abc', 'doctor')).toBe(ROLE_HOME.doctor);
    expect(safeReturnPath('/admin/audit', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath('/facility/team', 'admin')).toBe(ROLE_HOME.admin);
  });

  it('falls back to the role home for unknown or malformed paths', () => {
    expect(safeReturnPath('/nope', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath('', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath(null, 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath(42, 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath(`/${'a'.repeat(3000)}`, 'patient')).toBe(ROLE_HOME.patient);
  });

  it('refuses external, relative and protocol-relative targets (no open redirect)', () => {
    expect(safeReturnPath('https://evil.example/patient', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath('//evil.example/patient', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath('/\\evil.example/patient', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath('patient/orders', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath('javascript:alert(1)', 'patient')).toBe(ROLE_HOME.patient);
  });

  it('normalises traversal before deciding (cannot escape the role area)', () => {
    expect(safeReturnPath('/patient/../admin/audit', 'patient')).toBe(ROLE_HOME.patient);
    expect(safeReturnPath('/care/../../admin', 'doctor')).toBe(ROLE_HOME.doctor);
  });

  it('matches areas on a path boundary, not a string prefix', () => {
    expect(isPathAllowedForRole('/patients', 'patient')).toBe(false);
    expect(isPathAllowedForRole('/administrator', 'admin')).toBe(false);
    expect(isPathAllowedForRole('/patient', 'patient')).toBe(true);
  });
});

describe('rememberReturnPath / takeReturnPath (#226)', () => {
  it('records the path, search and hash of the attempted URL', () => {
    rememberReturnPath('http://localhost:5173/patient/orders/abc?tab=items#latest');
    expect(takeReturnPath()).toBe('/patient/orders/abc?tab=items#latest');
  });

  it('hands the recorded path over only once', () => {
    rememberReturnPath('http://localhost:5173/care/threads/t-1');
    expect(takeReturnPath()).toBe('/care/threads/t-1');
    expect(takeReturnPath()).toBeUndefined();
  });

  it('feeds safeReturnPath, so a wrong-role page still falls back home', () => {
    rememberReturnPath('http://localhost:5173/patient/orders/abc');
    expect(safeReturnPath(takeReturnPath(), 'doctor')).toBe(ROLE_HOME.doctor);

    rememberReturnPath('http://localhost:5173/patient/orders/abc');
    expect(safeReturnPath(takeReturnPath(), 'patient')).toBe('/patient/orders/abc');
  });
});
