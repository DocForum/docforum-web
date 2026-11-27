import { useFlag } from '../features/feature-flags/hooks/useFlags';
import { useRealtimeConnected } from './useServerEvents';

export function useRealtimeLive(): boolean {
  const enabled = useFlag('realtime_updates');
  const connected = useRealtimeConnected();
  return enabled && connected;
}
