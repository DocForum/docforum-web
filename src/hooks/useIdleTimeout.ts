// Idle-timeout tracking for shared clinical devices (issue #82).
//
// Design notes:
// - Timestamp-based, never interval-counting: background tabs get their
//   timers throttled, so the check interval may fire minutes late. It
//   always recomputes `now - lastActivityAt`, which stays correct no
//   matter how late it runs (see hooks/idle-timeout.ts).
// - Cross-tab: activity is broadcast on a BroadcastChannel and remote
//   timestamps are merged in, so typing in one tab keeps every other tab
//   alive. Broadcasts are throttled; merges are exact.
// - The interval and listeners are the only side effects; everything the
//   UI needs (phase, countdown) is derived from timestamps on each tick.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IDLE_ACTIVITY_CHANNEL,
  idlePhaseFor,
  mergeActivityTimestamps,
  msUntilExpiry,
  type IdlePhase,
} from './idle-timeout';
import type { SessionTimeoutSettings } from '../types/models';

export interface UseIdleTimeoutOptions {
  enabled: boolean;
  settings: SessionTimeoutSettings;
  onTimeout: () => void;
  /** How often the timestamp is re-checked. Production default: 5 s. */
  checkIntervalMs?: number;
  /** Test seams: explicit windows in ms instead of waiting real minutes. */
  timeoutMs?: number;
  warningMs?: number;
}

/** At most one cross-tab activity broadcast per this window. */
const BROADCAST_THROTTLE_MS = 2_000;

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;

export function useIdleTimeout(options: UseIdleTimeoutOptions) {
  const { enabled, settings, onTimeout, checkIntervalMs = 5_000, timeoutMs, warningMs } = options;

  const effective: SessionTimeoutSettings =
    timeoutMs !== undefined && warningMs !== undefined
      ? { idleTimeoutMinutes: timeoutMs / 60_000, warningSeconds: warningMs / 1_000 }
      : settings;

  const lastActivityRef = useRef(Date.now());
  const [tick, setTick] = useState(() => Date.now());
  const [phase, setPhase] = useState<IdlePhase>('active');
  const firedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastBroadcastRef = useRef(0);

  // Keep the latest callback without re-running the interval effect.
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const recordActivity = useCallback(() => {
    const at = Date.now();
    lastActivityRef.current = mergeActivityTimestamps(lastActivityRef.current, at);
    setTick(at);
    // Interacting while the warning is up dismisses it immediately —
    // no waiting for the next tick.
    setPhase((prev) => (prev === 'expired' ? prev : 'active'));
    const channel = channelRef.current;
    if (channel && at - lastBroadcastRef.current >= BROADCAST_THROTTLE_MS) {
      lastBroadcastRef.current = at;
      channel.postMessage({ at });
    }
  }, []);

  // The check loop: pure timestamp math, safe under timer throttling.
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const now = Date.now();
      setTick(now);
      setPhase(idlePhaseFor(lastActivityRef.current, now, effective));
    };
    check();
    const id = setInterval(check, checkIntervalMs);
    return () => clearInterval(id);
  }, [enabled, checkIntervalMs, effective.idleTimeoutMinutes, effective.warningSeconds]);

  // Fire onTimeout exactly once per expiry.
  useEffect(() => {
    if (phase === 'expired' && enabled && !firedRef.current) {
      firedRef.current = true;
      onTimeoutRef.current();
    }
    if (phase !== 'expired') firedRef.current = false;
  }, [phase, enabled]);

  // Local activity listeners (input + focus, per the issue).
  useEffect(() => {
    if (!enabled) return;
    const handleVisible = () => {
      if (document.visibilityState === 'visible') recordActivity();
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }
    window.addEventListener('focus', recordActivity);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
      window.removeEventListener('focus', recordActivity);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [enabled, recordActivity]);

  // Cross-tab coordination: keep the newest activity timestamp from any
  // tab. (Guarded — environments without BroadcastChannel just lose the
  // cross-tab nicety, never the timeout itself.)
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(IDLE_ACTIVITY_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ at?: number }>) => {
      const at = event.data?.at;
      if (typeof at === 'number') {
        lastActivityRef.current = mergeActivityTimestamps(lastActivityRef.current, at);
      }
    };
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [enabled]);

  return {
    phase,
    warningVisible: phase === 'warning',
    /** Whole seconds until sign-out — derived from timestamps each tick. */
    secondsRemaining: Math.max(
      1,
      Math.ceil(msUntilExpiry(lastActivityRef.current, tick, effective) / 1_000),
    ),
    /** "Stay signed in" — also what any user interaction does. */
    extendSession: recordActivity,
  };
}
