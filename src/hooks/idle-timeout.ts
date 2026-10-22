// Pure idle-timeout logic (issue #82) — no React, no timers, no DOM, so
// every rule here is unit-testable with fabricated timestamps.
//
// Everything is timestamp-based on purpose. Browser timers in background
// tabs are throttled (often to once a minute), so counting down with
// intervals drifts and can even sign an active user out. Recomputing
// `now - lastActivityAt` on every check — however late that check runs —
// is always correct.
import type { Role, SessionTimeoutSettings } from '../types/models';

/** BroadcastChannel keeping idle timestamps in sync across open tabs. */
export const IDLE_ACTIVITY_CHANNEL = 'docforum-idle-activity';

/**
 * Frontend defaults per role. Deliberately stricter for the roles that
 * see other people's records on shared clinical machines (PRD
 * requirement: doctor, facility and admin time out sooner than patients).
 */
export const IDLE_TIMEOUT_DEFAULTS: Record<Role, SessionTimeoutSettings> = {
  patient: { idleTimeoutMinutes: 30, warningSeconds: 60 },
  doctor: { idleTimeoutMinutes: 15, warningSeconds: 60 },
  facility: { idleTimeoutMinutes: 15, warningSeconds: 60 },
  admin: { idleTimeoutMinutes: 10, warningSeconds: 90 },
};

const MIN_TIMEOUT_MINUTES = 1;
const MAX_TIMEOUT_MINUTES = 480; // 8 hours — anything longer is a misconfiguration
const MIN_WARNING_SECONDS = 10;
const MAX_WARNING_SECONDS = 300;

/**
 * Validates the backend's settings; anything malformed falls back to the
 * frontend defaults (returns null) rather than trusting or crashing on it.
 * A backend value that IS valid takes precedence over the defaults.
 */
export function sanitizeSessionTimeoutSettings(raw: unknown): SessionTimeoutSettings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { idleTimeoutMinutes, warningSeconds } = raw as Record<string, unknown>;

  if (
    !Number.isInteger(idleTimeoutMinutes) ||
    (idleTimeoutMinutes as number) < MIN_TIMEOUT_MINUTES ||
    (idleTimeoutMinutes as number) > MAX_TIMEOUT_MINUTES
  ) {
    return null;
  }

  const warning = warningSeconds === undefined ? 60 : warningSeconds;
  if (!Number.isInteger(warning) || (warning as number) < MIN_WARNING_SECONDS || (warning as number) > MAX_WARNING_SECONDS) {
    return null;
  }
  // The warning must fit inside the timeout, with room to react.
  if ((warning as number) >= (idleTimeoutMinutes as number) * 60 - MIN_WARNING_SECONDS) {
    return null;
  }

  return { idleTimeoutMinutes: idleTimeoutMinutes as number, warningSeconds: warning as number };
}

export type IdlePhase = 'active' | 'warning' | 'expired';

/** Which phase `lastActivityAt` is in at time `now`. Late checks are fine —
 * the answer comes from timestamps, not from how many ticks ran. */
export function idlePhaseFor(
  lastActivityAt: number,
  now: number,
  settings: SessionTimeoutSettings,
): IdlePhase {
  const idleMs = Math.max(0, now - lastActivityAt);
  const timeoutMs = settings.idleTimeoutMinutes * 60_000;
  const warningMs = settings.warningSeconds * 1000;
  if (idleMs >= timeoutMs) return 'expired';
  if (idleMs >= timeoutMs - warningMs) return 'warning';
  return 'active';
}

/** Milliseconds until sign-out (0 once expired). Drives the countdown. */
export function msUntilExpiry(
  lastActivityAt: number,
  now: number,
  settings: SessionTimeoutSettings,
): number {
  return Math.max(0, lastActivityAt + settings.idleTimeoutMinutes * 60_000 - now);
}

/** Latest timestamp wins — merges local and cross-tab activity. */
export function mergeActivityTimestamps(...timestamps: number[]): number {
  return timestamps.reduce((max, t) => (Number.isFinite(t) && t > max ? t : max), 0);
}
