import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';

/** An empty state always offers the next thing to do — that is the point of
 * the component, so the action is required, not optional. */
export type EmptyStateAction =
  | { label: string; to: string; onClick?: never }
  | { label: string; onClick: () => void; to?: never };

export interface EmptyStateProps {
  title: string;
  /** Why the screen is empty and what filling it will do. */
  description?: string;
  /** Required next step. A link (`to`) when it navigates, a button otherwise. */
  action: EmptyStateAction;
  /** Optional decorative glyph. Ignored by assistive tech. */
  icon?: ReactNode;
  /** `compact` sits inside a card or panel, `page` fills a route body. */
  size?: 'compact' | 'page';
}

/**
 * Empty state (issue #106): never a dead end. If there is genuinely nothing to
 * show, the user is told why and given the one action that changes it
 * ("Book an appointment", "Choose a facility", "Reset the filter").
 */
export function EmptyState({ title, description, action, icon, size = 'compact' }: EmptyStateProps) {
  return (
    <div className={`${styles.empty} ${size === 'page' ? styles.page : ''}`}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {'to' in action && action.to ? (
        <Link className={styles.action} to={action.to}>
          {action.label}
        </Link>
      ) : (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
