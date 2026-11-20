import type { Role } from '../types/models';

/** A single navigation entry. `badge` renders a small count (e.g. unread). */
export interface NavItem {
  to: string;
  label: string;
  /** Roles allowed to see this item. Omit for unauthenticated items. */
  roles?: Role[];
  badge?: number;
  /** Dynamic badge source resolved by `Layout` instead of a static number. */
  badgeKey?: 'unreadMessages';
  /** Existing i18n id for the visible label; English `label` is the fallback. */
  messageId?: string;
}
