import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';

const CHANNEL_NAME = 'docforum-session-sync';

type SessionMessage =
  | { type: 'logout' }
  | { type: 'profile-change'; profileId: string };

let channel: BroadcastChannel | null = null;

export function useSessionSync(): void {
  const queryClient = useQueryClient();
  useEffect(() => startSessionSync(queryClient), [queryClient]);
}

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastLogout(): void {
  getChannel()?.postMessage({ type: 'logout' } satisfies SessionMessage);
}

export function startSessionSync(queryClient: QueryClient): () => void {
  const activeChannel = getChannel();
  if (!activeChannel) return () => {};

  let applyingRemoteProfile = false;
  let pendingProfileId: string | null = null;

  const applyProfile = (profileId: string) => {
    const store = useProfileStore.getState();
    if (!store.profiles.some((profile) => profile.id === profileId)) {
      pendingProfileId = profileId;
      return;
    }
    pendingProfileId = null;
    if (store.selectedProfileId === profileId) return;
    applyingRemoteProfile = true;
    store.selectProfile(profileId);
    applyingRemoteProfile = false;
  };

  const onMessage = (event: MessageEvent<unknown>) => {
    if (!isSessionMessage(event.data)) return;
    if (event.data.type === 'logout') {
      pendingProfileId = null;
      queryClient.clear();
      useAuthStore.getState().clearSession();
      useProfileStore.getState().clearProfiles();
    } else {
      applyProfile(event.data.profileId);
    }
  };

  activeChannel.addEventListener('message', onMessage);
  const unsubscribeProfile = useProfileStore.subscribe((state, previous) => {
    if (pendingProfileId && state.profiles.some((profile) => profile.id === pendingProfileId)) {
      applyProfile(pendingProfileId);
      return;
    }
    if (
      !applyingRemoteProfile
      && state.selectedProfileId
      && state.selectedProfileId !== previous.selectedProfileId
    ) {
      activeChannel.postMessage({
        type: 'profile-change',
        profileId: state.selectedProfileId,
      } satisfies SessionMessage);
    }
  });

  return () => {
    unsubscribeProfile();
    activeChannel.removeEventListener('message', onMessage);
    activeChannel.close();
    if (channel === activeChannel) channel = null;
  };
}

function isSessionMessage(value: unknown): value is SessionMessage {
  return Boolean(
    value
    && typeof value === 'object'
    && 'type' in value
    && (value.type === 'logout'
      || (value.type === 'profile-change'
        && 'profileId' in value
        && typeof value.profileId === 'string')),
  );
}
