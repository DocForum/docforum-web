import { describe, expect, it } from 'vitest';
import { flagEnabled, isKnownFlag, KNOWN_FLAGS, SAFE_FLAG_DEFAULT } from './flags';

describe('feature flag helpers', () => {
  it('treats a missing or failed flags payload as off', () => {
    expect(SAFE_FLAG_DEFAULT).toBe(false);
    expect(flagEnabled(undefined, 'notification_preferences')).toBe(false);
  });

  it('returns false for an unknown or non-boolean value', () => {
    expect(flagEnabled({ notification_preferences: true }, 'something_else')).toBe(false);
    expect(flagEnabled({ notification_preferences: 'true' as unknown as boolean }, 'notification_preferences')).toBe(
      false,
    );
  });

  it('only recognises the typed flag names', () => {
    expect(KNOWN_FLAGS).toContain('notification_preferences');
    expect(isKnownFlag('notification_preferences')).toBe(true);
    expect(isKnownFlag('not_a_real_flag')).toBe(false);
  });
});
