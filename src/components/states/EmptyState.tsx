import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';

export type EmptyStateAction =
  | { label: string; to: string; onClick?: never }
  | { label: string; onClick: () => void; to?: never };

export interface EmptyStateProps {
  title: string;
  /** Why the screen is empty and what filling it will do. */
  description?: string;
  /** Next step, when there is one the user can take from here. */
  action?: EmptyStateAction;
  /** Optional decorative glyph. Ignored by assistive tech. */
  icon?: ReactNode;
  /** `compact` sits inside a card or panel, `page` fills a route body. */
  size?: 'compact' | 'page';
}

/**
 * A deliberate empty state. It is never an error: there was a successful
 * response, and the range or filter genuinely contains nothing.
 */
export function EmptyState({ title, description, action, icon, size = 'compact' }: EmptyStateProps) {
  return (
    <div className={`${styles.empty} ${size === 'page' ? styles.page : ''}`} role="status">
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action &&
        ('to' in action && action.to ? (
          <Link className={styles.action} to={action.to}>
            {action.label}
          </Link>
        ) : (
          <button type="button" className={styles.action} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  );
}
