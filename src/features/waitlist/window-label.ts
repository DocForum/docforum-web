import type { PreferredTimeWindow } from '../../types/models';

/** Shared by the join dialog and the waitlist manager so both offer the same
 * preferred-window vocabulary. Kept out of the component file so fast refresh
 * can treat `JoinWaitlistDialog` as components-only. */
export const WINDOW_LABEL: Record<PreferredTimeWindow, string> = {
  anytime: 'Any time',
  morning: 'Mornings (before 12pm)',
  afternoon: 'Afternoons (12pm–5pm)',
  evening: 'Evenings (after 5pm)',
};
