/**
 * Typed flag names this frontend knows about. The backend may return more
 * keys; `useFlag` accepts any string so an untyped/unknown flag can still be
 * read behind a safe "off" default. Adding a name here is what makes a flag
 * discoverable in the dev-override panel and the nav/route gates.
 */
export const KNOWN_FLAGS = [
  'notification_preferences',
  'realtime_updates',
] as const;

export type FlagName = (typeof KNOWN_FLAGS)[number];

export function isKnownFlag(name: string): name is FlagName {
  return (KNOWN_FLAGS as readonly string[]).includes(name);
}

/** Shown in the mock dev panel next to the toggle. */
export const FLAG_DESCRIPTIONS: Record<FlagName, string> = {
  notification_preferences: 'Notification preferences and quiet-hours settings screen.',
  realtime_updates: 'Live Server-Sent Events and React Query cache updates.',
};

/**
 * A flag that fails to load is off. This is the single safe default used by
 * `useFlag`, `<Flag>` and `<RequireFlag>` — never the previous cached value
 * from another user.
 */
export const SAFE_FLAG_DEFAULT = false;

export function flagEnabled(flags: Record<string, boolean> | undefined, name: string): boolean {
  if (!flags) return SAFE_FLAG_DEFAULT;
  return flags[name] === true;
}
