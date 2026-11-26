import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store';
import { useLocaleStore } from './locale-store';
import { signOut } from '../services/sign-out';
import type { User } from '../types/models';

const USER: User = {
  id: 'usr-locale',
  email: 'lucia@example.test',
  role: 'patient',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

afterEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, csrfToken: null, signOutReason: null });
  useLocaleStore.getState().resetToBrowserLocale();
});

describe('locale from docforum-core (#256)', () => {
  it("applies the user's stored locale on sign-in", () => {
    useAuthStore.getState().setSession({ ...USER, locale: 'es' }, 'token');

    expect(useLocaleStore.getState().patientLocale).toBe('es');
    expect(useLocaleStore.getState().formattingLocale).toBe('es');
  });

  it('applies a regional stored tag through resolveLocale', () => {
    useAuthStore.getState().setSession({ ...USER, locale: 'es-MX' }, 'token');

    expect(useLocaleStore.getState().patientLocale).toBe('es');
  });

  it('falls back through resolveLocale for an unsupported stored locale', () => {
    useLocaleStore.getState().resetToBrowserLocale();

    expect(useLocaleStore.getState().applyUserLocale('fr')).toBe(true);
    expect(useLocaleStore.getState().patientLocale).toBe('en');
  });

  it('keeps a locale the person picked in this session', () => {
    useLocaleStore.getState().setFormattingLocale('en-US');

    expect(useLocaleStore.getState().applyUserLocale('es')).toBe(false);
    expect(useLocaleStore.getState().formattingLocale).toBe('en-US');

    useAuthStore.getState().setSession({ ...USER, locale: 'es' }, 'token');
    expect(useLocaleStore.getState().formattingLocale).toBe('en-US');
  });

  it('goes back to the browser language on sign-out', async () => {
    useAuthStore.getState().setSession({ ...USER, locale: 'es' }, 'token');
    expect(useLocaleStore.getState().patientLocale).toBe('es');

    await signOut('logout');

    expect(useLocaleStore.getState().patientLocale).toBe('en');
    expect(useLocaleStore.getState().manualOverride).toBe(false);
  });

  it('leaves the browser language alone when the account has no stored locale', () => {
    useLocaleStore.getState().setPatientLocale('es');
    useLocaleStore.getState().resetToBrowserLocale();

    useAuthStore.getState().setSession({ ...USER, locale: null }, 'token');

    expect(useLocaleStore.getState().patientLocale).toBe('en');
  });
});
