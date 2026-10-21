// Pure display logic for the admin operations overview board (issue #68):
// how a queue's count/age becomes a tone and an age label, and which known
// queue keys drill into which admin screen in this repo. No React here —
// everything is unit-tested in sections.test.ts.

import { ApiError } from '../../services/api-client';
import type { AdminOverviewSection } from '../../types/models';

/** How often the board re-polls while the tab is visible (issue #68:
 * "auto-refresh every minute while visible"). */
export const REFRESH_INTERVAL_MS = 60_000;

/** One colour meaning per board state, like the system-health board. */
export type SectionTone = 'ok' | 'info' | 'warning' | 'danger' | 'neutral';

/** A queue whose oldest item is past these ages escalates — the same
 * 24 h / 72 h cadence the disputes queue already badges at. */
export const ESCALATE_AFTER_MS = 24 * 60 * 60_000;
export const CRITICAL_AFTER_MS = 72 * 60 * 60_000;

export interface SectionDrillDown {
  /** Route in this repo that drills into the queue. */
  route: string;
  /** Link text for that drill-down. */
  action: string;
}

/** Queue keys from docforum-core's registry (docforum-core#123) that have a
 * screen in this repo. Keys without one yet (`verifications`,
 * `unrouted_orders`) render the card without a link, and unknown future
 * registry keys render as sent — also without a link — because the backend
 * may register sections this frontend version has never seen. */
const SECTION_ROUTES: Record<string, SectionDrillDown> = {
  stuck_referrals: { route: '/admin/referrals', action: 'Open the referrals console' },
  stuck_payments: { route: '/admin/payments/console', action: 'Open the payments console' },
  failed_jobs: { route: '/admin/system', action: 'Open system health' },
  open_disputes: { route: '/admin/disputes', action: 'Open the disputes queue' },
};

export function sectionDrillDown(key: string): SectionDrillDown | null {
  // hasOwn, not `in`: a key of "constructor" must not resolve to
  // Object.prototype.constructor.
  return Object.hasOwn(SECTION_ROUTES, key) ? SECTION_ROUTES[key] : null;
}

/** Age of the queue's oldest item in ms, or `null` when there is nothing to
 * report: unavailable section, empty queue, or an unparseable timestamp. */
export function oldestAgeMs(section: AdminOverviewSection, now: number): number | null {
  if (!section.available || !section.oldestItemCreatedAt) return null;
  const at = Date.parse(section.oldestItemCreatedAt);
  if (Number.isNaN(at)) return null;
  // Clock skew must never render a negative age.
  return Math.max(0, now - at);
}

/** Urgency of one card. Unavailable is neutral (muted), an empty queue is
 * `ok`, and an aging queue escalates from info → warning → danger. */
export function sectionTone(section: AdminOverviewSection, now: number): SectionTone {
  if (!section.available) return 'neutral';
  if (!section.count) return 'ok';
  const age = oldestAgeMs(section, now);
  if (age === null) return 'info';
  if (age >= CRITICAL_AFTER_MS) return 'danger';
  if (age >= ESCALATE_AFTER_MS) return 'warning';
  return 'info';
}

/** "under a minute", "45 minutes", "3 hours", "2 days" — compact, for the
 * card detail line. */
export function formatAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 60_000) return 'under a minute';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  // Past 48 h the card says days — always plural, since days only starts at 2.
  if (hours < 48) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${Math.floor(hours / 24)} days`;
}

const AUTH_MESSAGE = 'Your session no longer has admin access. Sign in again with an admin account.';

/** Board-level failure wording. A whole-endpoint `404` is expected while the
 * backend catches up (docforum-core#123 hasn't landed), so it is a muted
 * notice — never an error page. */
export function boardErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "docforum-core doesn't serve the operations overview yet (docforum-core#123).";
    if (error.status === 401 || error.status === 403) return AUTH_MESSAGE;
  }
  return "Couldn't load the operations overview. The preview backend may be waking up — this board tries again every 60 seconds.";
}
