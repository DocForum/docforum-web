import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { signOut, type SignOutReason } from './sign-out';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import { useUnsavedChangesStore } from '../store/unsaved-changes-store';
import type { ActingProfile, User } from '../types/models';

const user: User = {
  id: 'usr-1',
  email: 'person@example.test',
  role: 'patient',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const profile: ActingProfile = { id: 'prf-1', fullName: 'Demo Patient', isSelf: true };

function seedSession(queryClient: QueryClient): void {
  useAuthStore.getState().setSession(user, 'access-token', 'csrf-token');
  useProfileStore.setState({ profiles: [profile], selectedProfileId: profile.id });
  useUnsavedChangesStore.setState({ count: 1 });
  queryClient.setQueryData(['health', profile.id], [{ id: 'private-record' }]);
}

describe('signOut', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, csrfToken: null, signOutReason: null });
    useProfileStore.setState({ profiles: [], selectedProfileId: null });
    useUnsavedChangesStore.setState({ count: 0 });
    vi.restoreAllMocks();
  });

  const reasons: SignOutReason[] = [
    'logout',
    'session-expired',
    'account-deleted',
    'mock',
  ];

  for (const reason of reasons) {
    it(`clears the query cache, profile store and unsaved changes on ${reason}`, async () => {
      const queryClient = new QueryClient();
      seedSession(queryClient);

      await signOut(reason, { queryClient });

      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
      expect(useProfileStore.getState().profiles).toHaveLength(0);
      expect(useProfileStore.getState().selectedProfileId).toBeNull();
      expect(useUnsavedChangesStore.getState().count).toBe(0);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().csrfToken).toBeNull();
      expect(useAuthStore.getState().signOutReason).toBeNull();
    });
  }

  it('records the idle-timeout reason while clearing everything else', async () => {
    const queryClient = new QueryClient();
    seedSession(queryClient);

    await signOut('idle-timeout', { queryClient });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useProfileStore.getState().profiles).toHaveLength(0);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().signOutReason).toBe('idle-timeout');
  });
});
