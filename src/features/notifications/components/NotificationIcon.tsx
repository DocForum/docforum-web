import type { NotificationCategory } from '../notification-meta';
import styles from './NotificationIcon.module.css';

const PATHS: Record<NotificationCategory, string> = {
  // Calendar.
  appointment: 'M4 5h16v15H4zM8 3v4M16 3v4M4 10h16',
  // Branching arrow.
  referral: 'M5 19V6a2 2 0 0 1 2-2h4M13 8l4 4-4 4M19 12H9',
  // Small parcel.
  order: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  // Document with a tick.
  result: 'M6 3h8l4 4v14H6zM14 3v5h5M9 14l2 2 4-4',
  // Card.
  payment: 'M3 7h18v11H3zM3 11h18M7 15h4',
  // Speech bubble.
  message: 'M4 5h16v11H9l-5 4z',
  // Scales.
  dispute: 'M12 4v16M6 8h12M6 8l-3 6h6zM18 8l-3 6h6z',
  // Bell (generic / unknown kinds).
  other: 'M6 17h12l-2-3V9a4 4 0 0 0-8 0v5zM10 20h4',
};

export function NotificationIcon({ category }: { category: NotificationCategory }) {
  return (
    <span className={styles.icon} data-category={category} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={PATHS[category]} />
      </svg>
    </span>
  );
}
