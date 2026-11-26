import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { useApiReachabilityStore } from '../store/api-reachability-store';

/**
 * Subscribes to React Query's `onlineManager`, which is wired to the
 * browser's online/offline events in `main.tsx`. Queries pause while
 * offline and resume on reconnect (`networkMode: 'online'`).
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => onlineManager.subscribe(onStoreChange),
    () => onlineManager.isOnline(),
    // SSR/test fallback: assume online so nothing is hidden unnecessarily.
    () => true,
  );
}

/**
 * Tracks backend API reachability from boot ping and network/5xx responses.
 */
export function useApiReachability(): boolean {
  return useApiReachabilityStore((state) => state.isApiReachable);
}

