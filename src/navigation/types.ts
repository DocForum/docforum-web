import type { Role } from '../types/models';

/** A single navigation entry. `badge` renders a small count (e.g. unread). */
export interface NavItem {
  to: string;
  label: string;
  /** Roles allowed to see this item. Omit for unauthenticated items. */
  roles?: Role[];
  badge?: number;
  /** Existing i18n id for the visible label; English `label` is the fallback. */
  messageId?: string;
  /**
   * Secondary entries (payments, settings) are rendered after a visual
   * divider on desktop so the primary workflow stays on one line at 1280px.
   * The mobile drawer keeps a single flat list.
   */
  group?: 'primary' | 'secondary';
}
