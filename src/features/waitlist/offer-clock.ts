// Countdown maths for waitlist offers (issue #16).
//
// The device clock is never trusted on its own: an offer's expiry is absolute
// server time, and `serverNow` (sent with the offer) tells us how far the
// device clock is from the server. Everything below is pure so the offset
// behaviour can be tested without waiting on real time.

/** How far ahead of the device clock the server is, in milliseconds. */
export function serverClockOffsetMs(serverNow: string, clientNow: number = Date.now()): number {
  const serverMs = Date.parse(serverNow);
  if (Number.isNaN(serverMs)) return 0;
  return serverMs - clientNow;
}

/** Milliseconds left on an offer, measured against server time. */
export function remainingMs(
  expiresAt: string,
  offsetMs: number,
  clientNow: number = Date.now(),
): number {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, expiry - (clientNow + offsetMs));
}

/** `m:ss`, floored to the second so "0:00" only appears once it is over. */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Under a minute left — the UI emphasises the countdown (colour only, so
 * it still means something with animations turned off). */
export function isUrgent(ms: number): boolean {
  return ms > 0 && ms <= 60_000;
}
