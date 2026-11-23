import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEMO_ROLE_STORAGE_KEY,
  readStoredDemoRole,
  useDemoStore,
} from './demo-store';
import { useAuthStore } from '../store/auth-store';
import { queryClient } from '../query-client';

beforeEach(() => {
  sessionStorage.clear();
  useAuthStore.getState().clearSession();
  useDemoStore.setState({ role: null, pickerOpen: true });
  queryClient.clear();
});

describe('demo role selection', () => {
  it('signs the chosen persona in and remembers the role', () => {
    useDemoStore.getState().chooseRole('facility');

    expect(useAuthStore.getState().user?.role).toBe('facility');
    expect(sessionStorage.getItem(DEMO_ROLE_STORAGE_KEY)).toBe('facility');
    expect(useDemoStore.getState().role).toBe('facility');
    expect(useDemoStore.getState().pickerOpen).toBe(false);
  });

  it('drops cached responses when switching role', () => {
    queryClient.setQueryData(['doctor-messages'], ['patient data from the previous role']);
    useDemoStore.getState().chooseRole('doctor');
    expect(queryClient.getQueryData(['doctor-messages'])).toBeUndefined();
  });

  it('only trusts known roles from storage', () => {
    sessionStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'admin');
    expect(readStoredDemoRole()).toBe('admin');

    sessionStorage.setItem(DEMO_ROLE_STORAGE_KEY, 'superuser');
    expect(readStoredDemoRole()).toBeNull();
  });

  it('keeps the picker open until a role has been chosen', () => {
    useDemoStore.getState().closePicker();
    expect(useDemoStore.getState().pickerOpen).toBe(true);

    useDemoStore.getState().chooseRole('patient');
    useDemoStore.getState().closePicker();
    expect(useDemoStore.getState().pickerOpen).toBe(false);
  });
});
