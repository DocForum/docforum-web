import { Link } from 'react-router-dom';
import { amountLabel } from '../stroops';
import { formatDay, orderTypeLabel, statusLabel } from '../status';
import type { PaymentHistoryEntry } from '../../../types/models';
import styles from './PaymentHistoryList.module.css';

export function PaymentHistoryList({ entries }: { entries: PaymentHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className={styles.empty}>
        You have not paid for anything through DocForum yet. Once a facility takes an order and you fund it, the
        payment and its receipt appear here.
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link to={`/payments/${entry.id}`} className={styles.row}>
            <span className={styles.amount}>{amountLabel(entry.amountStroops)}</span>
            <span className={styles.meta}>
              {orderTypeLabel(entry.orderType)}
              {/* The real API response carries only `facilityId`; the name is an
                  assumed extra, so absence shows the order type alone rather
                  than an internal id. */}
              {entry.facilityName ? ` · ${entry.facilityName}` : ''}
            </span>
            <span className={styles.status} data-status={entry.status}>
              {statusLabel(entry.status)}
            </span>
            <span className={styles.date}>{formatDay(entry.createdAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
