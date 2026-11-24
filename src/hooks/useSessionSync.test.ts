import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { broadcastLogout, startSessionSync } from './useSessionSync';

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  readonly sent: unknown[] = [];
  private listeners = new Set<(event: MessageEvent<unknown>) => void>();
  closed = false;

  constructor(readonly name: string) {
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(message: unknown) {
    this.sent.push(message);
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void) {
    this.listeners.delete(listener);
  }

  close() {
    this.closed = true;
  }

  dispatch(data: unknown) {
    for (const listener of this.listeners) listener({ data } as MessageEvent<unknown>);
  }
}

describe('session sync', () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'patient@example.test',
        role: 'patient',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      accessToken: 'secret-token',
    });
    useProfileStore.setState({
      profiles: [
        { id: 'profile-1', fullName: 'Patient One', isSelf: true },
        { id: 'profile-2', fullName: 'Patient Two', isSelf: false },
      ],
      selectedProfileId: 'profile-1',
    });
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.unstubAllGlobals();
  });

  it('clears auth, profiles and cached data when another tab logs out', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private-record'], { id: 'record-1' });
    stop = startSessionSync(queryClient);
    const channel = MockBroadcastChannel.instances[0]!;

    channel.dispatch({ type: 'logout' });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useProfileStore.getState().selectedProfileId).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(channel.sent).toEqual([]);
  });

  it('broadcasts profile ids only and applies received profile changes without echoing them', () => {
    const queryClient = new QueryClient();
    stop = startSessionSync(queryClient);
    const channel = MockBroadcastChannel.instances[0]!;

    useProfileStore.getState().selectProfile('profile-2');
    expect(channel.sent).toEqual([{ type: 'profile-change', profileId: 'profile-2' }]);

    channel.dispatch({ type: 'profile-change', profileId: 'profile-1' });
    expect(useProfileStore.getState().selectedProfileId).toBe('profile-1');
    expect(channel.sent).toHaveLength(1);
  });

  it('waits for profiles to load before applying a remote profile selection', () => {
    const queryClient = new QueryClient();
    useProfileStore.setState({ profiles: [], selectedProfileId: null });
    stop = startSessionSync(queryClient);
    const channel = MockBroadcastChannel.instances[0]!;

    channel.dispatch({ type: 'profile-change', profileId: 'profile-2' });
    useProfileStore.getState().setProfiles([
      { id: 'profile-1', fullName: 'Patient One', isSelf: true },
      { id: 'profile-2', fullName: 'Patient Two', isSelf: false },
    ]);

    expect(useProfileStore.getState().selectedProfileId).toBe('profile-2');
    expect(channel.sent).toEqual([]);
  });

  it('broadcasts logout without including auth data', () => {
    stop = startSessionSync(new QueryClient());

    broadcastLogout();

    expect(MockBroadcastChannel.instances[0]?.sent).toEqual([{ type: 'logout' }]);
  });

  it('closes the channel and stops listening when synchronization is stopped', () => {
    const queryClient = new QueryClient();
    stop = startSessionSync(queryClient);
    const channel = MockBroadcastChannel.instances[0]!;
    stop();
    stop = undefined;

    channel.dispatch({ type: 'logout' });

    expect(channel.closed).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('secret-token');
  });

  it('degrades without BroadcastChannel support', () => {
    vi.stubGlobal('BroadcastChannel', undefined);

    expect(() => startSessionSync(new QueryClient())()).not.toThrow();
    expect(() => broadcastLogout()).not.toThrow();
  });
});
