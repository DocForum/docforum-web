import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE_HOME } from '../navigation/role-home';
import type { Role } from '../types/models';
import { DevPanel } from './DevPanel';
import { useMockStore } from './mock-store';
import { isMockDeepLink } from './navigation';
import { activateMockRole, mockSignOut } from './roles';

const ROLES: Role[] = ['patient', 'doctor', 'facility', 'admin'];

function resetLocation(pathname = '/', hash = ''): void {
  window.history.replaceState(null, '', `${pathname}${hash}`);
}

describe('mock role navigation', () => {
  beforeEach(() => {
    useMockStore.setState({
      scenario: 'normal',
      latencyMs: 0,
      activeRole: 'patient',
      flagOverrides: {},
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetLocation();
  });

  it('switches roles with clean paths and popstate in BrowserRouter mode', () => {
    vi.stubEnv('VITE_USE_HASH_ROUTER', 'false');
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent');

    for (const role of ROLES) {
      resetLocation('/doctor/insights');
      activateMockRole(role);
      expect(window.location.pathname).toBe(ROLE_HOME[role]);
      expect(window.location.hash).toBe('');
    }
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'popstate' }));

    resetLocation('/doctor/insights');
    mockSignOut();
    expect(window.location.pathname).toBe('/login');
    expect(window.location.hash).toBe('');
  });

  it('switches roles with hashes in HashRouter mode', () => {
    vi.stubEnv('VITE_USE_HASH_ROUTER', 'true');

    for (const role of ROLES) {
      resetLocation('/', '#/doctor/insights');
      activateMockRole(role);
      expect(window.location.hash).toBe(`#${ROLE_HOME[role]}`);
    }

    resetLocation('/', '#/doctor/insights');
    mockSignOut();
    expect(window.location.hash).toBe('#/login');
  });

  it('detects deep links from the pathname or the hash according to the router flag', () => {
    vi.stubEnv('VITE_USE_HASH_ROUTER', 'false');
    expect(isMockDeepLink({ pathname: '/doctor/insights', hash: '' })).toBe(true);
    expect(isMockDeepLink({ pathname: '/patient?tab=orders', hash: '' })).toBe(true);
    expect(isMockDeepLink({ pathname: '/', hash: '' })).toBe(false);
    expect(isMockDeepLink({ pathname: '/index.html', hash: '' })).toBe(false);
    expect(isMockDeepLink({ pathname: '/faq/', hash: '' })).toBe(false);

    vi.stubEnv('VITE_USE_HASH_ROUTER', 'true');
    expect(isMockDeepLink({ pathname: '/', hash: '#/doctor/insights' })).toBe(true);
    expect(isMockDeepLink({ pathname: '/', hash: '#/patient?x=1' })).toBe(true);
    expect(isMockDeepLink({ pathname: '/', hash: '#/' })).toBe(false);
    expect(isMockDeepLink({ pathname: '/', hash: '#section' })).toBe(false);
  });

  it('keeps role navigation router-agnostic in PR preview builds', () => {
    vi.stubEnv('VITE_USE_HASH_ROUTER', 'true');
    vi.stubEnv('VITE_PREVIEW_MOCKS', 'true');

    resetLocation('/', '#/doctor/insights');
    activateMockRole('patient');
    expect(window.location.hash).toBe('#/patient');
  });

  it('does not navigate when asked to only apply the persona', () => {
    vi.stubEnv('VITE_USE_HASH_ROUTER', 'false');
    resetLocation('/doctor/insights');

    activateMockRole('patient', { navigate: false });

    expect(window.location.pathname).toBe('/doctor/insights');
    expect(window.location.hash).toBe('');
  });

  it('navigates from the dev panel in both router modes', async () => {
    const user = userEvent.setup();

    vi.stubEnv('VITE_USE_HASH_ROUTER', 'false');
    resetLocation('/doctor/insights');
    const browserView = render(<DevPanel />);
    await user.click(screen.getByRole('button', { name: 'doctor' }));
    expect(window.location.pathname).toBe('/doctor');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(window.location.pathname).toBe('/login');
    browserView.unmount();

    vi.stubEnv('VITE_USE_HASH_ROUTER', 'true');
    resetLocation('/', '#/doctor/insights');
    const hashView = render(<DevPanel />);
    await user.click(screen.getByRole('button', { name: 'doctor' }));
    expect(window.location.hash).toBe('#/doctor');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(window.location.hash).toBe('#/login');
    hashView.unmount();
  });
});
